let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let request = require('request');
let fs = require('fs');
let jsdom = require("jsdom");
let { JSDOM } = jsdom;
let fetch = require('fetch-base64');
let session = require('express-session');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'safmksdgafmklamlkgsakmlasdlkmlkm', cookie: { maxAge: 3600 }}));

app.get('/', function(req,res){
    'use strict';
   res.send('run');
});

// GET - CPF Captcha
app.get('/cpf/getcaptcha', function(req, res) {
    let Nightmare = require('nightmare');
    let nightmare = Nightmare({ show: false });

    nightmare
    .useragent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:8.0) Gecko/20100101 Firefox/8.0')
    .header(['http://cpf.receita.fazenda.gov.br/situacao/'])
    .goto('http://cpf.receita.fazenda.gov.br/situacao/', {
        referrer: 'http://cpf.receita.fazenda.gov.br/situacao/',
        method: 'GET'
    })
    .wait(function(){
        return (document.querySelector('#img_captcha_serpro_gov_br').src !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAAyCAYAAAD1JPH3AAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAOwwAADsMBx2+oZAAAAAd0SU1FB98HDhIGOWu+9+kAAAB3SURBVHja7dIBDQAACMMwwL/n4wNaCcs6SQqOGAkwNBgaDA2GxtBgaDA0GBoMjaHB0GBoMDQYGkODocHQYGgwNIYGQ4OhwdBgaAwNhgZDg6HB0BgaDA2GBkODoTE0GBoMDYbG0GBoMDQYGgyNocHQYGgwNBiabxY7GwRg7rtJrAAAAABJRU5ErkJggg==');
    })
    .evaluate(function() {
        return {
            captcha_cpf: document.querySelector('#img_captcha_serpro_gov_br').src,
            token_cpf: document.getElementById('txtToken_captcha_serpro_gov_br').value,
            status: true,
            cookieId: ''
        }
    })
    .end()
    .then(function (result) {
        nightmare.halt().then(() => {
            console.log('ELECTRON HALT');
        });
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(result));
    })
    .catch(function (error) {
        console.error('Search failed:', error);

        let result = {
            captcha_cpf: '',
            token_cpf: '',
            cookieId: '',
            status: false,
            error: error
        };

        res.send(JSON.stringify(result));
    });
});

// GET - Consulta CPF Form
app.get('/cpf/consulta', function(req, res) {
    res.sendFile(__dirname+'/pages/cpf.html');
});

// POST - CPF Data
app.post('/cpf/processar', function(req, res) {

    try {

        let dadosEnviar = {
            'txtToken_captcha_serpro_gov_br': req.body.txtToken_captcha_serpro_gov_br,
            'txtTexto_captcha_serpro_gov_br': req.body.txtTexto_captcha_serpro_gov_br,
            'txtCPF': req.body.txtCPF,
            'txtDataNascimento': req.body.txtDataNascimento,
        };

        request.post({
                url: 'http://cpf.receita.fazenda.gov.br/situacao/ConsultaSituacao.asp',
                form: dadosEnviar,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:8.0) Gecko/20100101 Firefox/8.0',
                    'Referer': 'http://cpf.receita.fazenda.gov.br/situacao/'
                },
                followAllRedirects: true,
            },
            function (err, httpResponse, body) {
                const dom = new JSDOM(body);

                let retornoConsulta = {
                    Numero: '',
                    Nome: '',
                    DataNascimento: '',
                    Situacao: '',
                    DataInscricao: '',
                    DigitoVerificador: '',
                    Status: 'Parâmetros Inválidos',
                    Success: false
                };

                if (dom.window.document.querySelector('#idMessageError') !== null) {
                    retornoConsulta.Status = dom.window.document.querySelector('#idMessageError').textContent.replace(/(\r\n|\n|\r)/gm, '').trim();
                }

                if (dom.window.document.querySelector('#idCnt05') !== null) {
                    retornoConsulta = {
                        Numero: dom.window.document.querySelector('#idCnt05').firstElementChild.textContent,
                        Nome: dom.window.document.querySelector('#idCnt04').firstElementChild.textContent,
                        DataNascimento: dom.window.document.querySelector('#idCnt13').firstElementChild.textContent,
                        Situacao: dom.window.document.querySelector('#idCnt06').firstElementChild.textContent,
                        DataInscricao: dom.window.document.querySelector('#idCnt14').firstElementChild.textContent,
                        DigitoVerificador: dom.window.document.querySelector('#idCnt07').firstElementChild.textContent,
                        Status: 'OK',
                        Success: true
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

// GET - Consulta CNPJ Form
app.get('/cnpj/consulta', function(req, res) {
    res.sendFile(__dirname+'/pages/cnpj.html');
});

// GET - CNPJ Captcha
app.get('/cnpj/getcaptcha', function(req, res) {
    try {
        fs.writeFile('cookies/' + req.sessionID + '.json', '', function () {
            let FileCookieStore = require('tough-cookie-filestore');
            let j = request.jar(new FileCookieStore('cookies/' + req.sessionID + '.json'));
            let options = {};
            options.url = 'http://www.receita.fazenda.gov.br/PessoaJuridica/CNPJ/cnpjreva/captcha/gerarCaptcha.asp';
            options.method = 'GET';
            options.encoding = 'base64';
            options.jar = j;
            options.headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:8.0) Gecko/20100101 Firefox/8.0',
            };

            request.get(options, function (err, response, corpo) {
                if (response.statusCode === 200) {

                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({
                        'base64': corpo,
                        'cookieId': req.sessionID,
                        'success': true
                    }));
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({
                        'base64': '',
                        'success': false
                    }));
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
});

// GET - Consulta CNPJ Form
app.get('/cnpj/processa', function(req, res) {

});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});