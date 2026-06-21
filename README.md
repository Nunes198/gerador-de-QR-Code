# Gerador de QR Code

Projeto simples que gera plaquinhas de pagamento Pix a partir de uma chave, nome, cidade e valor.

Visão geral
- Arquivos principais: [index.html](index.html), [style.css](style.css), [app.js](app.js).
- O gerador usa as bibliotecas `qrcodejs` e `html2canvas` (carregadas via CDN).

Como usar
1. Clone o repositório ou baixe os arquivos.
2. Abra [index.html](index.html) em um navegador moderno (Chrome, Edge, Firefox ou Safari).
3. Preencha: Tipo de chave, Chave Pix, Nome, Cidade (valor e txid são opcionais).
4. Use os botões para copiar o payload, baixar o QR ou gerar a imagem da plaquinha.

Notas técnicas
- A lógica de geração do payload Pix está em [app.js](app.js). Não é necessário executar servidor — é uma página estática.
- A estilização foi separada em [style.css](style.css).

Contribuição
- Sinta-se à vontade para abrir issues ou enviar pull requests.

Licença
- Sem licença definida. Adicione um `LICENSE` se desejar publicar sob termos específicos.

Nota sobre arquivo antigo
- O arquivo original `gerador qr code.html` foi removido do repositório — a versão atualizada está em [index.html](index.html) com CSS e JS separados (`style.css`, `app.js`).

