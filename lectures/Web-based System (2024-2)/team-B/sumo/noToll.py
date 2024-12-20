import os, sys
import sumolib
import traci
import time
import pandas as pd
import xml.etree.ElementTree as ET
import traci.constants

net = sumolib.net.readNet('gangnam.net.xml')
edges = net.getEdges()

sumoBinary = sumolib.checkBinary('sumo')
sumoCmd = [sumoBinary, "-c", "gangnam.sumocfg"]

traci.start(sumoCmd, label="sim")

# 초기 도로 통과에 필요한 시간 설정
for edge in edges:
    edge_id = edge.getID()
    elen = traci.lane.getLength(edge_id + "_0")
    e_s = traci.lane.getMaxSpeed(edge_id + "_0")
    traci.edge.setEffort(edge_id, (elen / e_s) * 0.7)



# 시뮬레이션 루프: 24시간 (86400초)로 설정    
step = 0
while step < 86400:
    traci.simulationStep()   
    if traci.simulation.getTime() % 60 == 0:#1분 마다 모든 차량들 루트 변경, 요금 없음
        for edge in edges:
            traci.edge.setEffort(edge.getID(), traci.edge.getTraveltime(edge.getID()))
                        # 경로 재지정 -> 각 차량 별 현재 위치 st
						# 각 차량 별 도착지 dt
						# 각 차량 타입 veh
						# traci.simulation.findRout 출발지에서 목적지까지 최소 edge.Effort에 따른 경로 설정
        for vehId in traci.vehicle.getIDList():
            st = traci.vehicle.getRoadID(vehId)
            dt = traci.vehicle.getRoute(vehId)[-1]
            veh = traci.vehicle.getTypeID(vehId)
            route = traci.simulation.findRoute(st, dt, vType=veh, depart=step,  routingMode=2).edges
            traci.vehicle.setRoute(vehId, route)

        for vehId in traci.simulation.getDepartedIDList():
            traci.vehicle.rerouteEffort(vehId)
    if step % 60 == 0:
            print(step)
    step += 1
traci.close()
