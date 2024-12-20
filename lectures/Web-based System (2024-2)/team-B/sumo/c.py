import os
import sys
import sumolib
import traci
import time
import xml.etree.ElementTree as ET

# 요율 계산
median_income = 2077892  # 월 소득 (원)
hours_in_a_month = 30 * 8  # 한 달 기준 시간 (8시간 * 30일)
hourly_rate = median_income / hours_in_a_month  # 시간당 임금
secondary_rate = hourly_rate / 3600  # 초당 임금
toll = 3000  # 통행료 (원)
toll_to_time = toll / secondary_rate  # 통행료를 시간으로 변환
print(f"Toll converted to time: {toll_to_time:.2f} seconds")

# XML 파일 로드 및 TAZ 데이터 추출
tree = ET.parse('districts/teheran_district.xml')
root = tree.getroot()

tazlist = [taz_sink.get("id") for taz in root.iter("taz") for taz_sink in taz.findall("tazSink")]
print(f"Loaded TAZ list: {tazlist}")

# SUMO 네트워크 로드
net = sumolib.net.readNet('gangnam.net.xml')
edges = net.getEdges()
print(f"Loaded network with {len(edges)} edges.")

# SUMO 시뮬레이션 실행
sumoBinary = sumolib.checkBinary('sumo')
sumoCmd = [sumoBinary, "-c", "gangnam.sumocfg"]
traci.start(sumoCmd, label="sim")
print("SUMO simulation started.")

# Effort 초기화
for edge in edges:
    edge_id = edge.getID()
    elen = traci.lane.getLength(edge_id + "_0")
    e_s = traci.lane.getMaxSpeed(edge_id + "_0")
    traci.edge.setEffort(edge_id, (elen / e_s) * 0.7)

# 시뮬레이션 루프
step = 0
while step < 86400:  # 24시간 시뮬레이션
    traci.simulationStep()

    # 혼잡 시간대 Effort 조정 (07:00~21:00)
    if 25200 < step < 75600:
        if traci.simulation.getTime() % 60 == 0:  # 매 60초마다 업데이트
            for edge in edges:
                base_effort = traci.edge.getTraveltime(edge.getID())
                if edge.getID() in tazlist:
                    # TAZ 내부 도로 Effort 증가
                    new_effort = base_effort + toll_to_time
                    traci.edge.setEffort(edge.getID(), new_effort)
                else:
                    # 일반 도로 Effort 기본값 유지
                    traci.edge.setEffort(edge.getID(), base_effort)

            # 차량 경로 재설정
            for vehId in traci.vehicle.getIDList():
                st = traci.vehicle.getRoadID(vehId)
                dt = traci.vehicle.getRoute(vehId)[-1]
                veh = traci.vehicle.getTypeID(vehId)
                route = traci.simulation.findRoute(st, dt, vType=veh, depart=step, routingMode=2).edges
                traci.vehicle.setRoute(vehId, route)

            # 신규 차량 Effort 기반 재경로
            for vehId in traci.simulation.getDepartedIDList():
                traci.vehicle.rerouteEffort(vehId)

    # 비혼잡 시간대
    else:
        if traci.simulation.getTime() % 60 == 0:
            for edge in edges:
                base_effort = traci.edge.getTraveltime(edge.getID())
                traci.edge.setEffort(edge.getID(), base_effort)

            for vehId in traci.vehicle.getIDList():
                st = traci.vehicle.getRoadID(vehId)
                dt = traci.vehicle.getRoute(vehId)[-1]
                veh = traci.vehicle.getTypeID(vehId)
                route = traci.simulation.findRoute(st, dt, vType=veh, depart=step, routingMode=2).edges
                traci.vehicle.setRoute(vehId, route)

            for vehId in traci.simulation.getDepartedIDList():
                traci.vehicle.rerouteEffort(vehId)

    # 로그 출력
    if step % 60 == 0:
        print(f"Simulation step: {step}")

    step += 1

# 시뮬레이션 종료
traci.close()
print("SUMO simulation ended.")
