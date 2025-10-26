// --- index.js (A Forja - Edição dos Clãs) ---

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());

const USUARIOS_DB = './usuarios.json';
const ALUNOS_CSV = './base_alunos.csv'; // Lendo o arquivo correto!
const CLAS_DB = './clas.json';

// Carregando a base de alunos na memória para consultas rápidas
const baseAlunos = [];
fs.createReadStream(ALUNOS_CSV)
  .pipe(csv())
  .on('data', (data) => baseAlunos.push(data))
  .on('end', () => {
    console.log('📜 O Tomo da Academia (base_alunos.csv) foi lido e memorizado.');
  });

// Endpoint 1: O Oráculo (Identifica o usuário pelo telefone)
app.post('/identificar', (req, res) => {
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ mensagem: "Telefone é obrigatório." });

    // 1º - Procura no Tomo da Academia
    const alunoInfo = baseAlunos.find(aluno => aluno.TELEFONE === telefone);
    if (alunoInfo) {
        const nomeCompleto = `${alunoInfo.NOME} ${alunoInfo.SOBRENOME}`;
        return res.json({ tipo: 'aluno', nome: nomeCompleto });
    }

    // 2º - Procura no Tomo dos Aventureiros (visitantes já cadastrados)
    const dbUsuarios = JSON.parse(fs.readFileSync(USUARIOS_DB, 'utf-8'));
    const jogadorExistente = dbUsuarios.jogadores.find(j => j.telefone === telefone);
    if (jogadorExistente) {
        // Se o jogador existe e tem um clã, envia os dados do clã para o frontend
        if (jogadorExistente.cla_id) {
            const dbClas = JSON.parse(fs.readFileSync(CLAS_DB, 'utf-8'));
            const cla = dbClas.familias.find(c => c.id === jogadorExistente.cla_id);
            return res.json({ tipo: 'visitante_existente', nome: jogadorExistente.nomeCompleto, cla });
        }
        return res.json({ tipo: 'visitante_existente', nome: jogadorExistente.nomeCompleto });
    }
    
    // 3º - Se não achou em lugar nenhum, é um rosto novo
    return res.json({ tipo: 'novo_visitante' });
});

// Endpoint 2: O Scribe (Registra a visita, gamificação e clãs)
app.post('/registrar-visita', (req, res) => {
    const { telefone, nomeCompleto, nickname, interesses, novoCla, membrosPresentes } = req.body;

    const dbUsuarios = JSON.parse(fs.readFileSync(USUARIOS_DB, 'utf-8'));
    let jogador = dbUsuarios.jogadores.find(j => j.telefone === telefone);
    let cla_id = null;

    // Se um novo clã está sendo criado (fluxo do pai de família)
    if (novoCla && novoCla.membros && novoCla.membros.length > 0) {
        const dbClas = JSON.parse(fs.readFileSync(CLAS_DB, 'utf-8'));
        const idFamilia = Date.now();
        const novaFamilia = {
            id: idFamilia,
            nome_familia: `Família de ${nomeCompleto}`,
            membros: [{ nome: nomeCompleto, telefone }, ...novoCla.membros]
        };
        dbClas.familias.push(novaFamilia);
        fs.writeFileSync(CLAS_DB, JSON.stringify(dbClas, null, 2));
        cla_id = idFamilia;
    }

    // Se o jogador não existe, cria um novo registro
    if (!jogador) {
        const alunoInfo = baseAlunos.find(aluno => aluno.TELEFONE === telefone);
        const nomeFinal = alunoInfo ? `${alunoInfo.NOME} ${alunoInfo.SOBRENOME}` : nomeCompleto;
        
        jogador = {
            telefone,
            nomeCompleto: nomeFinal,
            nickname: nickname || nomeFinal,
            contador_visitas: 0,
            cla_id: cla_id, // Atribui o ID do clã se ele foi criado neste momento
            historicoVisitas: []
        };
        dbUsuarios.jogadores.push(jogador);
    }
    
    // Atualiza o nickname se um novo foi fornecido
    if(nickname) jogador.nickname = nickname;

    // Incrementa visita e adiciona ao histórico
    jogador.contador_visitas++;
    jogador.historicoVisitas.push({
        data: new Date().toISOString(),
        interesses: interesses || [],
        membrosPresentes: membrosPresentes || []
    });

    fs.writeFileSync(USUARIOS_DB, JSON.stringify(dbUsuarios, null, 2));

    // Lógica simples de gamificação
    const mensagemGamificacao = `Visita Nº ${jogador.contador_visitas} registrada! Continue jogando conosco!`;

    res.status(200).json({
        nome: jogador.nickname,
        mensagemGamificacao
    });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 A Forja dos Clãs está operando na porta ${PORT}!`);
});