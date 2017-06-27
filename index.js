let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let request = require('request');
let jsdom = require("jsdom");
let { JSDOM } = jsdom;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/getcaptcha', function(req, res) {
    let Nightmare = require('nightmare');
    let nightmare = Nightmare({ show: false });

    nightmare
    .useragent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:8.0) Gecko/20100101 Firefox/8.0')
    .goto('http://cpf.receita.fazenda.gov.br/situacao/')
    .wait(function(){
        return (document.querySelector('#img_captcha_serpro_gov_br').src !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAAyCAYAAAD1JPH3AAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAOwwAADsMBx2+oZAAAAAd0SU1FB98HDhIGOWu+9+kAAAB3SURBVHja7dIBDQAACMMwwL/n4wNaCcs6SQqOGAkwNBgaDA2GxtBgaDA0GBoMjaHB0GBoMDQYGkODocHQYGgwNIYGQ4OhwdBgaAwNhgZDg6HB0BgaDA2GBkODoTE0GBoMDYbG0GBoMDQYGgyNocHQYGgwNBiabxY7GwRg7rtJrAAAAABJRU5ErkJggg==');
    })
    .evaluate(function() {
        return {
            captcha: document.querySelector('#img_captcha_serpro_gov_br').src,
            tokenCpf: document.getElementById('txtToken_captcha_serpro_gov_br').value,
            status: true
        }
    })
    .end()
    .then(function (result) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(result));
    })
    .catch(function (error) {
        console.error('Search failed:', error);

        let result = {
            captcha: '',
            tokenCpf: '',
            status: false,
            error: error
        };

        res.send(JSON.stringify(result));
    });
});

app.get('/consulta-cpf', function(req, res) {
    res.sendFile(__dirname+'/pages/form.html');
});

app.post('/processar', function(req, res) {

    try {

        let dadosEnviar = {
            'txtToken_captcha_serpro_gov_br': req.body.txtToken_captcha_serpro_gov_br,
            'txtTexto_captcha_serpro_gov_br': req.body.txtTexto_captcha_serpro_gov_br,
            'txtCPF': req.body.txtCPF,
            'txtDataNascimento': req.body.txtDataNascimento,
        };

        request.post(
            {
                url: 'http://cpf.receita.fazenda.gov.br/situacao/ConsultaSituacao.asp',
                form: dadosEnviar,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:8.0) Gecko/20100101 Firefox/8.0'
                },
                followAllRedirects: true,
            },
            function (err, httpResponse, body) {
                const dom = new JSDOM(body);

                let retornoConsulta = {
                    'Numero': '',
                    'Nome': '',
                    'DataNascimento': '',
                    'Situacao': '',
                    'DataInscricao': '',
                    'DigitoVerificador': '',
                    'Status': 'Parâmetros Inválidos',
                    'Success': false
                };

                if(dom.window.document.querySelector('#idMessageError') !== null){
                    retornoConsulta.Status = dom.window.document.querySelector('#idMessageError').textContent.replace(/(\r\n|\n|\r)/gm,"").trim();
                }

                if (dom.window.document.querySelector('#idCnt05') !== null) {
                    retornoConsulta = {
                        'Numero': dom.window.document.querySelector('#idCnt05').firstElementChild.textContent,
                        'Nome': dom.window.document.querySelector('#idCnt04').firstElementChild.textContent,
                        'DataNascimento': dom.window.document.querySelector('#idCnt13').firstElementChild.textContent,
                        'Situacao': dom.window.document.querySelector('#idCnt06').firstElementChild.textContent,
                        'DataInscricao': dom.window.document.querySelector('#idCnt14').firstElementChild.textContent,
                        'DigitoVerificador': dom.window.document.querySelector('#idCnt07').firstElementChild.textContent,
                        'Status': 'OK',
                        'Success': true
                    };
                }

                console.log('Consulta Realizada: ' + (new Date()));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(retornoConsulta));
            });

    } catch (err) {
        console.log(err);
        console.log('Deu Erro!');
    }
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});