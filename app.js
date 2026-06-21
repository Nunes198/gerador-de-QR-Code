const tipoChave = document.getElementById('tipoChave');
const chavePix = document.getElementById('chavePix');
const nome = document.getElementById('nome');
const cidade = document.getElementById('cidade');
const valor = document.getElementById('valor');
const txid = document.getElementById('txid');
const logoInput = document.getElementById('logoInput');
const btnRemoveLogo = document.getElementById('btnRemoveLogo');
const showChaveTxt = document.getElementById('showChaveTxt');
const errorMessage = document.getElementById('errorMessage');

const previewLogo = document.getElementById('previewLogo');
const viewNome = document.getElementById('viewNome');
const viewCidade = document.getElementById('viewCidade');
const viewValor = document.getElementById('viewValor');
const boxChaveManual = document.getElementById('boxChaveManual');
const viewChaveManual = document.getElementById('viewChaveManual');
const qrcodeElement = document.getElementById('qrcode');

let qrCodeInstance = new QRCode(qrcodeElement, {
    text: "000201",
    width: 240,
    height: 240,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

let currentPayload = "";
let logoDataURL = "";

function removeAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function formatarTLV(tag, valor) {
    const len = String(valor).length.toString().padStart(2, '0');
    return `${tag}${len}${valor}`;
}

function calcularCRC16(str) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < str.length; i++) {
        let b = str.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            let bit = ((b >> (7 - j)) & 1) == 1;
            let c15 = ((crc >> 15) & 1) == 1;
            crc <<= 1;
            if (c15 ^ bit) crc ^= polynomial;
        }
    }
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function obterChaveTratada() {
    let raw = chavePix.value.trim();
    const tipo = tipoChave.value;

    if (tipo === 'celular') {
        const digitos = raw.replace(/\D/g, '');
        return digitos ? `+55${digitos}` : '';
    } else if (tipo === 'cpf' || tipo === 'cnpj') {
        return raw.replace(/\D/g, '');
    }
    return raw;
}

function formatarChaveVisual(chave, tipo) {
    const digitos = chave.replace(/\D/g, '');
    if (tipo === 'celular' && digitos.length >= 11) {
        let d = digitos.startsWith('55') ? digitos.substring(2) : digitos;
        if(d.length === 11) {
            return `(${d.substring(0,2)}) ${d.substring(2,7)}-${d.substring(7)}`;
        }
        return d;
    }
    if (tipo === 'cpf' && digitos.length === 11) {
        return `${digitos.substring(0,3)}.${digitos.substring(3,6)}.${digitos.substring(6,9)}-${digitos.substring(9)}`;
    }
    if (tipo === 'cnpj' && digitos.length === 14) {
        return `${digitos.substring(0,2)}.${digitos.substring(2,5)}.${digitos.substring(5,8)}/${digitos.substring(8,12)}-${digitos.substring(12)}`;
    }
    return chave;
}

function gerarPixPayload() {
    errorMessage.style.display = 'none';
    
    const chave = obterChaveTratada();
    // Mantém .substring(0,25) estritamente aqui para respeitar o limite padrão do BC no QR Code
    let nomeVal = removeAcentos(nome.value.trim()).substring(0, 25);
    let cidadeVal = removeAcentos(cidade.value.trim()).substring(0, 15);
    let txidVal = txid.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);

    if (!chave || !nomeVal || !cidadeVal) {
        return "";
    }

    const sub26_00 = formatarTLV("00", "br.gov.bcb.pix");
    const sub26_01 = formatarTLV("01", chave);
    const merchantAccountInfo = formatarTLV("26", sub26_00 + sub26_01);

    let payload = "";
    payload += formatarTLV("00", "01");
    payload += formatarTLV("01", "11");
    payload += merchantAccountInfo;
    payload += formatarTLV("52", "0000");
    payload += formatarTLV("53", "986");

    let valorTexto = valor.value.replace(',', '.').trim();
    if (valorTexto) {
        const num = parseFloat(valorTexto);
        if (!isNaN(num) && num > 0) {
            payload += formatarTLV("54", num.toFixed(2));
        }
    }

    payload += formatarTLV("58", "BR");
    payload += formatarTLV("59", nomeVal);
    payload += formatarTLV("60", cityPadrao(cidadeVal));

    const sub62_05 = formatarTLV("05", txidVal || "***");
    payload += formatarTLV("62", sub62_05);

    payload += "6304";
    const crc = calcularCRC16(payload);
    payload += crc;

    return payload;
}

function cityPadrao(c) {
    return c.length < 1 ? "BR" : c;
}

function atualizarPlaquinha() {
    // Na exibição visual da plaquinha, mostra o nome completo digitado (sem cortar com substring)
    viewNome.textContent = removeAcentos(nome.value.trim()) || "NOME DO RECEBEDOR";
    viewCidade.textContent = removeAcentos(cidade.value.trim()) || "CIDADE";

    let valorTexto = valor.value.replace(',', '.').trim();
    const num = parseFloat(valorTexto);
    if (valorTexto && !isNaN(num) && num > 0) {
        viewValor.textContent = `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        viewValor.style.display = 'block';
    } else {
        viewValor.style.display = 'none';
    }

    if (showChaveTxt.checked && chavePix.value.trim()) {
        viewChaveManual.textContent = formatarChaveVisual(chavePix.value.trim(), tipoChave.value);
        boxChaveManual.style.display = 'block';
    } else {
        boxChaveManual.style.display = 'none';
    }

    currentPayload = gerarPixPayload();
    if (currentPayload) {
        qrCodeInstance.clear();
        qrCodeInstance.makeCode(currentPayload);
    }
}

logoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            logoDataURL = evt.target.result;
            previewLogo.src = logoDataURL;
            previewLogo.style.display = 'block';
            btnRemoveLogo.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

btnRemoveLogo.addEventListener('click', function() {
    logoInput.value = "";
    logoDataURL = "";
    previewLogo.src = "";
    previewLogo.style.display = 'none';
    btnRemoveLogo.style.display = 'none';
});

[tipoChave, chavePix, nome, cityPadrao, valor, txid, showChaveTxt].forEach(el => {
    if(el && el.addEventListener) {
        el.addEventListener('input', atualizarPlaquinha);
    }
});
 
nome.addEventListener('input', atualizarPlaquinha);
cidade.addEventListener('input', atualizarPlaquinha);

tipoChave.addEventListener('change', () => {
    if(tipoChave.value === 'celular') chavePix.placeholder = "(47) 99999-8888";
    else if(tipoChave.value === 'cpf') chavePix.placeholder = "000.000.000-00";
    else if(tipoChave.value === 'cnpj') chavePix.placeholder = "00.000.000/0000-00";
    else chavePix.placeholder = "Chave Pix";
    atualizarPlaquinha();
});

function validarCampos() {
    if (!chavePix.value.trim() || !nome.value.trim() || !cidade.value.trim()) {
        errorMessage.textContent = "Preencha a Chave Pix, Nome e Cidade para habilitar o código.";
        errorMessage.style.display = 'block';
        return false;
    }
    errorMessage.style.display = 'none';
    return true;
}

document.getElementById('btnCopy').addEventListener('click', function() {
    if (!validarCampos()) return;
    navigator.clipboard.writeText(currentPayload).then(() => {
        alert("Código Pix copiado!");
    }).catch(err => {
        alert("Erro ao copiar.");
    });
});

document.getElementById('btnDownloadQR').addEventListener('click', function() {
    if (!validarCampos()) return;
    const imgEl = qrcodeElement.querySelector('img');
    if (imgEl) {
        const link = document.createElement('a');
        link.download = 'qrcode-pix.png';
        link.href = imgEl.src;
        link.click();
    }
});

document.getElementById('btnDownloadPlaquinha').addEventListener('click', function() {
    if (!validarCampos()) return;
    
    const target = document.getElementById('plaquinhaArte');
    html2canvas(target, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `plaquinha-pix-${nome.value.trim().toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

document.getElementById('btnPrint').addEventListener('click', function() {
    if (!validarCampos()) return;
    window.print();
});

nome.value = "JOAO DA SILVA";
cidade.value = "BLUMENAU";
chavePix.value = "teste@email.com";
tipoChave.value = "email";
valor.value = "10,00";
atualizarPlaquinha();
