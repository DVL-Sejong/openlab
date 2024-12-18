// 파일 드래그 앤 드롭 함수 구현
// 데이터셋 업로드 -> 메인 페이지 흐름
document.addEventListener('DOMContentLoaded', () => {
    $('.dataset-name').text("Dataset");
    $('#prev-btn').hide();
    $('#download-btn').hide();
    const drop = document.querySelector('.file-container');

    // 파일 정보를 표시할 요소들 추가
    const fileInfoDiv = document.createElement('div');
    fileInfoDiv.className = 'file-info';
    fileInfoDiv.style.display = 'none';
    
    const uploadBox = document.createElement('div');
    uploadBox.className = 'upload-box';
    uploadBox.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <div class="upload-text">Drag and drop files here</div>
        <div class="upload-subtext">or click to upload</div>
    `;
    drop.appendChild(uploadBox);
    
    const fileName = document.createElement('p');
    fileName.style.fontWeight = '500';
    
    const fileSize = document.createElement('p');
    fileSize.style.color = '#666';
    fileSize.style.fontSize = '12px';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '15px';

    const newFileButton = document.createElement('button');
    newFileButton.textContent = 'Select Another File';
    newFileButton.className = 'newfile-btn';

    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load File';
    loadButton.className = 'load-button';
    
    
    buttonContainer.appendChild(newFileButton);
    buttonContainer.appendChild(loadButton);

    fileInfoDiv.appendChild(fileName);
    fileInfoDiv.appendChild(fileSize);
    fileInfoDiv.appendChild(buttonContainer);
    drop.appendChild(fileInfoDiv);

    // 전체 document에 드래그 앤 드롭 이벤트 리스너 추가
    document.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    document.addEventListener('drop', (event) => {
        event.preventDefault();
    });


    uploadBox.addEventListener('dragover', (event)=>{
        uploadBox.style.backgroundColor = '#e0e0e0';
    });

    uploadBox.addEventListener('dragleave', ()=>{
        uploadBox.style.backgroundColor = '#ffffff';
    })

    // 파일 처리 함수
    const handleFile = (file) => {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            fileName.textContent = `📄 ${file.name}`;
            const size = file.size > 1024 * 1024 
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : `${(file.size / 1024).toFixed(2)} KB`;
            fileSize.textContent = `파일 크기: ${size}`;
            
            uploadBox.style.display = 'none';
            uploadBox.disabled = true;
            fileInfoDiv.style.display = 'block';
            
            loadButton.onclick = (e) => {
                e.stopPropagation();
                handleFileUpload(file);
            };

            newFileButton.onclick = (e) => {
                e.stopPropagation();
                uploadBox.style.display = 'flex';
                fileInfoDiv.style.display = 'none';
                uploadBox.disabled = false;
                uploadBox.style.backgroundColor = '#ffffff';
            };
        } else {
            alert('CSV 파일만 업로드 가능합니다.');
            uploadBox.style.display = 'flex';
            fileInfoDiv.style.display = 'none';
        }
    };

    uploadBox.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadBox.style.backgroundColor = '#f0f0f0';

        const files = event.dataTransfer.files;
        
        if (files.length > 1) {
            alert('파일은 하나만 업로드 가능합니다.');
            uploadBox.style.backgroundColor = '#eb6363a6';
            fileInfoDiv.style.display = 'none';
            return;
        }
        
        if (files.length === 1) {
            handleFile(files[0]);
        }
    });

    uploadBox.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.multiple = false;
        fileInput.click();
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        });
    });
});

function showLoading() {
    document.querySelector('.loading-spinner').style.display = 'block';
    // 블러 오버레이 추가
    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(2px);
        z-index: 999;
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    document.querySelector('.loading-spinner').style.display = 'none';
    // 블러 오버레이 제거
    const overlay = document.querySelector('.blur-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 파일 업로드 처리 함수 내부
function handleFileUpload(file) {
    console.log(file, file.name, file.type);
    const formData = new FormData();
    formData.append('file', file)
    //const fileData = new File([file], file.name, { type: file.type });
    showLoading(); // 로딩 시작

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if(response.ok) {
            hideLoading(); // 로딩 종료
            localStorage.setItem('dataset-name', file.name);
            window.location.href = '/dashboard';
        } else {
            return response.json().then(data => {
                hideLoading(); // 로딩 종료
                alert(`파일 업로드에 실패했습니다. 에러: ${data.error}`);
            });
        }
    })
    .catch(error => {
        hideLoading(); // 에러 시에도 로딩 종료
        alert('파일 업로드에 실패했습니다. ' + error);
    });
}