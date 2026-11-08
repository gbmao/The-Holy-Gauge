const imageInput = document.querySelector('#imageInput');
const motorcycleImage = document.querySelector('#motorcycleImage');
const imageDropzone = document.querySelector('#imageDropzone');
const chooseImageButton = document.querySelector('#chooseImageButton');
const headerUploadButton = document.querySelector('#headerUploadButton');
const fileStatusTitle = document.querySelector('#fileStatusTitle');
const fileName = document.querySelector('#fileName');

const IMAGE_STORAGE_KEY = 'controlador-da-moto-image';
const IMAGE_NAME_STORAGE_KEY = 'controlador-da-moto-image-name';
let currentObjectUrl = null;

function loadSavedImage() {
  try {
    const savedImage = localStorage.getItem(IMAGE_STORAGE_KEY);
    const savedImageName = localStorage.getItem(IMAGE_NAME_STORAGE_KEY);

    if (savedImage) {
      motorcycleImage.src = savedImage;
      motorcycleImage.alt = savedImageName || 'Imagem da minha moto';
      fileStatusTitle.textContent = 'Imagem salva';
      fileName.textContent = savedImageName || 'Imagem escolhida anteriormente';
    }
  } catch {
    // The default image remains available if browser storage is disabled.
  }
}

function openImagePicker() {
  imageInput.click();
}

function isImageFile(file) {
  return file && (
    file.type.startsWith('image/') ||
    /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name)
  );
}

function showImage(file) {
  if (!isImageFile(file)) {
    fileStatusTitle.textContent = 'Arquivo não suportado';
    fileName.textContent = 'Escolha uma imagem para continuar';
    return;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  motorcycleImage.src = currentObjectUrl;
  motorcycleImage.alt = file.name;
  fileStatusTitle.textContent = 'Imagem escolhida';
  fileName.textContent = file.name;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      localStorage.setItem(IMAGE_STORAGE_KEY, reader.result);
      localStorage.setItem(IMAGE_NAME_STORAGE_KEY, file.name);
    } catch {
      fileStatusTitle.textContent = 'Imagem escolhida';
      fileName.textContent = 'Disponível nesta sessão';
    }
  });
  reader.readAsDataURL(file);
}

chooseImageButton.addEventListener('click', openImagePicker);
headerUploadButton.addEventListener('click', openImagePicker);
imageDropzone.addEventListener('click', openImagePicker);

imageDropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openImagePicker();
  }
});

imageInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  showImage(file);
  event.target.value = '';
});

imageDropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  imageDropzone.classList.add('is-dragging');
});

imageDropzone.addEventListener('dragleave', () => {
  imageDropzone.classList.remove('is-dragging');
});

imageDropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  imageDropzone.classList.remove('is-dragging');
  const [file] = event.dataTransfer.files;
  showImage(file);
});

window.addEventListener('beforeunload', () => {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
});

loadSavedImage();
