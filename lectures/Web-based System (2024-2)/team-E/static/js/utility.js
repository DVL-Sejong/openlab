$(document).ready(function() {

    $('#prev-btn').click(function() {
        localStorage.removeItem('dataset-name');
        window.location.href = '/';
    });

    $('#prev-btn').hover(function() {
        $(this).attr('data-bs-title', '다른 데이터셋 선택');
        $(this).tooltip({
            placement: 'auto',
            trigger: 'hover'
        }).tooltip('show');
    });

    $('#download-btn').click(function() {
        // 다운로드 기능 구현
        var augType = $('.aug-select').val();
        if(augType == "default"){
            alert("증강 기법을 선택해주세요.");
            return;
        }
        fetch(`/download?augType=${augType}`)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'augmented_dataset.csv';
            a.click();
        });
    });

    $('#download-btn').hover(function() {
        $(this).attr('data-bs-title', '증강 데이터셋 다운로드');
        $(this).tooltip({
            placement: 'auto',
            trigger: 'hover'
        }).tooltip('show');
    });

    $('#info-chatbot img').hover(function() {
        // hover 시 tooltip 표시
        $(this).attr('data-bs-title', "증강된 데이터로<br> fine-tuning한 모델을<br> 사용한 챗봇입니다.");
        $(this).tooltip({
            placement: 'auto',
            trigger: 'hover',
            html: true
        }).tooltip('show');
    });

    $('#info-augdata img').hover(function() {
        $(this).attr('data-bs-title', '증강기법을 적용한<br>데이터 예시입니다.');
        $(this).tooltip({
            placement: 'auto',
            trigger: 'hover',
            html: true
        }).tooltip('show');
    });


    $('#info-tsne img').hover(function() {
        // hover 시 tooltip 표시
        $(this).attr('data-bs-title', '원본 데이터셋과의<br>거리를 통해 증강 데이터셋의<br>신뢰도를 판단합니다.');
        $(this).tooltip({
            placement: 'auto',
            trigger: 'hover',
            html: true
        }).tooltip('show');
    });

});