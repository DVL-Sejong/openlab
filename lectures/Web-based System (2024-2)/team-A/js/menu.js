let toggle = false;

function menuin_out() {
  const menu = document.getElementById("graphbar");
  const button = document.getElementById("menu_button");
  console.log(button);

  if (toggle == true) {
    menu.style.right = "-580px";
    button.style.right = "0px";
    button.value = "<";

    toggle = false;
  } else {
    menu.style.right = "5px";
    button.style.right = "585px";
    button.value = ">";

    toggle = true;
  }
}

// 선택된 도로 ID로 그래프를 생성
function onRoadSelected(roadId) {
  document.getElementById("graphbar");
  menu.style.display = "block"; // 그래프 표시 영역 열기
  showGraphs(roadId); // roadId에 따라 그래프 생성
}
