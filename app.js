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

function somenteDigitos(valor) {
    return valor.replace(/\D/g, '');
}

function formatarCpf(digitos) {
    return digitos
        .slice(0, 11)
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatarCnpj(digitos) {
    return digitos
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatarChavePixDigitada(valor, tipo) {
    const digitos = somenteDigitos(valor);

    if (tipo === 'cpf') {
        return formatarCpf(digitos);
    }

    if (tipo === 'cnpj') {
        return formatarCnpj(digitos);
    }

    return valor;
}

function validarCpf(digitos) {
    if (!/^\d{11}$/.test(digitos)) return false;
    if (/^(\d)\1+$/.test(digitos)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(digitos[i], 10) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(digitos[9], 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(digitos[i], 10) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(digitos[10], 10);
}

function validarCnpj(digitos) {
    if (!/^\d{14}$/.test(digitos)) return false;
    if (/^(\d)\1+$/.test(digitos)) return false;

    const calcularDigito = (base, pesos) => {
        let soma = 0;
        for (let i = 0; i < pesos.length; i++) {
            soma += parseInt(base[i], 10) * pesos[i];
        }
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const pesosPrimeiro = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesosSegundo = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const digito1 = calcularDigito(digitos.slice(0, 12), pesosPrimeiro);
    if (digito1 !== parseInt(digitos[12], 10)) return false;

    const digito2 = calcularDigito(digitos.slice(0, 13), pesosSegundo);
    return digito2 === parseInt(digitos[13], 10);
}

function validarChaveDocumento(tipo, valor) {
    const digitos = somenteDigitos(valor);

    if (tipo === 'cpf') {
        return {
            valido: validarCpf(digitos),
            completo: digitos.length === 11
        };
    }

    if (tipo === 'cnpj') {
        return {
            valido: validarCnpj(digitos),
            completo: digitos.length === 14
        };
    }

    return { valido: true, completo: true };
}

function aplicarMascaraChavePix() {
    if (tipoChave.value === 'cpf') {
        chavePix.value = formatarCpf(somenteDigitos(chavePix.value));
        return;
    }

    if (tipoChave.value === 'cnpj') {
        chavePix.value = formatarCnpj(somenteDigitos(chavePix.value));
    }
}

function configurarCampoChave() {
    if (tipoChave.value === 'cpf') {
        chavePix.placeholder = '000.000.000-00';
        chavePix.inputMode = 'numeric';
        chavePix.maxLength = 14;
    } else if (tipoChave.value === 'cnpj') {
        chavePix.placeholder = '00.000.000/0000-00';
        chavePix.inputMode = 'numeric';
        chavePix.maxLength = 18;
    } else if (tipoChave.value === 'celular') {
        chavePix.placeholder = '(47) 99999-8888';
        chavePix.inputMode = 'tel';
        chavePix.maxLength = 20;
    } else {
        chavePix.placeholder = 'Chave Pix';
        chavePix.inputMode = 'text';
        chavePix.maxLength = 120;
    }
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
    const tipo = tipoChave.value;
    const validacaoDocumento = validarChaveDocumento(tipo, chavePix.value.trim());

    if ((tipo === 'cpf' || tipo === 'cnpj') && validacaoDocumento.completo && !validacaoDocumento.valido) {
        errorMessage.textContent = tipo === 'cpf'
            ? 'CPF inválido. Confira os números e a pontuação.'
            : 'CNPJ inválido. Confira os números e a pontuação.';
        errorMessage.style.display = 'block';
        return "";
    }

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

[tipoChave, nome, cityPadrao, valor, txid, showChaveTxt].forEach(el => {
    if(el && el.addEventListener) {
        el.addEventListener('input', atualizarPlaquinha);
    }
});
 
nome.addEventListener('input', atualizarPlaquinha);
cidade.addEventListener('input', atualizarPlaquinha);

chavePix.addEventListener('input', () => {
    aplicarMascaraChavePix();
    atualizarPlaquinha();
});

tipoChave.addEventListener('change', () => {
    configurarCampoChave();
    aplicarMascaraChavePix();
    atualizarPlaquinha();
});

function validarCampos() {
    if (!chavePix.value.trim() || !nome.value.trim() || !cidade.value.trim()) {
        errorMessage.textContent = "Preencha a Chave Pix, Nome e Cidade para habilitar o código.";
        errorMessage.style.display = 'block';
        return false;
    }

    const tipo = tipoChave.value;
    const validacaoDocumento = validarChaveDocumento(tipo, chavePix.value.trim());

    if (tipo === 'cpf' && !validacaoDocumento.valido) {
        errorMessage.textContent = validacaoDocumento.completo
            ? 'CPF inválido. Confira a pontuação e os dígitos.'
            : 'CPF incompleto. Digite 11 números.';
        errorMessage.style.display = 'block';
        return false;
    }

    if (tipo === 'cnpj' && !validacaoDocumento.valido) {
        errorMessage.textContent = validacaoDocumento.completo
            ? 'CNPJ inválido. Confira a pontuação e os dígitos.'
            : 'CNPJ incompleto. Digite 14 números.';
        errorMessage.style.display = 'block';
        return false;
    }

    errorMessage.style.display = 'none';
    return true;
}

function baixarArquivoPng(canvas, nomeArquivo) {
    canvas.toBlob(blob => {
        if (!blob) {
            alert("Erro ao gerar o PNG.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
}

document.getElementById('btnCopy').addEventListener('click', function() {
    if (!validarCampos()) return;
    navigator.clipboard.writeText(chavePix.value.trim()).then(() => {
        alert("Chave Pix copiada!");
    }).catch(err => {
        alert("Erro ao copiar.");
    });
});

document.getElementById('btnDownloadQR').addEventListener('click', function() {
    if (!validarCampos()) return;

    const qrCanvas = qrcodeElement.querySelector('canvas');
    if (qrCanvas) {
        baixarArquivoPng(qrCanvas, 'qrcode-pix.png');
        return;
    }

    const imgEl = qrcodeElement.querySelector('img');
    if (imgEl) {
        const canvas = document.createElement('canvas');
        const size = imgEl.naturalWidth || imgEl.width;
        canvas.width = size;
        canvas.height = size;

        const contexto = canvas.getContext('2d');
        if (!contexto) {
            alert("Erro ao gerar o PNG.");
            return;
        }

        contexto.drawImage(imgEl, 0, 0, size, size);
        baixarArquivoPng(canvas, 'qrcode-pix.png');
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
valor.value = "";
configurarCampoChave();
atualizarPlaquinha();
