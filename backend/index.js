// --- index.js (Versão Completa e Corrigida - com Flag subiuDeNivel) ---

// 1. IMPORTAÇÕES E CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());

const USUARIOS_DB = './usuarios.json';
const ALUNOS_CSV = './base_alunos.csv';
const CLAS_DB = './clas.json';

// 2. LEITURA DE DADOS E PREPARAÇÃO
// -----------------------------------------------------------------------------
let baseAlunos = [];
try {
    if (fs.existsSync(ALUNOS_CSV)) {
        fs.createReadStream(ALUNOS_CSV)
          .pipe(csv())
          .on('data', (data) => baseAlunos.push(data))
          .on('end', () => {
            console.log(`📜 A base de dados foi lida com sucesso!. Total de ${baseAlunos.length} alunos.`);
            if (baseAlunos.length > 0) {
                console.log('Colunas encontradas no CSV:', Object.keys(baseAlunos[0]));
            }
          });
    } else {
        console.warn(`⚠️  Aviso: O arquivo ${ALUNOS_CSV} não foi encontrado. A funcionalidade de identificação de alunos estará desativada.`);
    }
} catch (error) {
    console.error(`❌ ERRO CRÍTICO: Não foi possível ler o arquivo ${ALUNOS_CSV}.`, error);
    baseAlunos = [];
}

// 3. FUNÇÕES AUXILIARES
// -----------------------------------------------------------------------------

const lerJSON = (caminho, valorPadrao) => {
    try {
        if (fs.existsSync(caminho)) {
            const data = fs.readFileSync(caminho, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Erro ao ler ou parsear o arquivo JSON ${caminho}:`, error);
    }
    return valorPadrao;
};


// Normaliza o telefone para conter apenas números
const limparTelefone = (tel) => (tel || '').replace(/\D/g, '');

// Define quanto de XP (moedas) é necessário para cada nível
const xpPorNivel = (nivel) => 1000 * nivel * 1.5;

// Define a recompensa em moedas por visita, baseada no nível do jogador
const calcularRecompensa = (nivel) => {
    if (nivel <= 5) return 300;
    if (nivel <= 10) return 500;
    if (nivel <= 20) return 800;
    return 1200; // Para níveis acima de 20
};

// 4. ENDPOINTS PRINCIPAIS DA APLICAÇÃO
// -----------------------------------------------------------------------------

// Endpoint 1: O Oráculo (Identifica o usuário pelo telefone)
app.post('/identificar', (req, res) => {
    const { telefone } = req.body;
    if (!telefone) {
        return res.status(400).json({ mensagem: "Telefone é obrigatório." });
    }

    const telefoneLimpo = limparTelefone(telefone);

    // 1º - Procura no Tomo da Academia (alunos)
    const alunoInfo = baseAlunos.find(aluno => limparTelefone(aluno.TELEFONE) === telefoneLimpo);
    if (alunoInfo) {
        const nome = alunoInfo.NOME || 'Aluno';
        const sobrenome = (alunoInfo.SOBRENOME || '').split(' ')[0];
        const nomeExibicao = `${nome} ${sobrenome}`.trim();
        return res.json({ tipo: 'aluno', nome: nomeExibicao });
    }

    // 2º - Procura no Tomo dos Aventureiros (visitantes já cadastrados)
    const dbUsuarios = lerJSON(USUARIOS_DB, { jogadores: [] });
    const jogadorExistente = dbUsuarios.jogadores.find(j => j.telefone === telefoneLimpo);
    
    if (jogadorExistente) {
        if (jogadorExistente.cla_id) {
            const dbClas = lerJSON(CLAS_DB, { familias: [] });
            const cla = dbClas.familias.find(c => c.id === jogadorExistente.cla_id);
            return res.json({ tipo: 'visitante_existente', nome: jogadorExistente.nickname || jogadorExistente.nomeCompleto, cla });
        }
        return res.json({ tipo: 'visitante_existente', nome: jogadorExistente.nickname || jogadorExistente.nomeCompleto });
    }
    
    // 3º - É um rosto novo (novo visitante)
    return res.json({ tipo: 'novo_visitante' });
});

// Endpoint 2: O Scribe (Registra a visita, gamificação e clãs)
app.post('/registrar-visita', (req, res) => {
    const { telefone, nomeCompleto, nickname, interesses, novoCla, membrosPresentes } = req.body;
    const telefoneLimpo = limparTelefone(telefone);

    if (!telefoneLimpo) {
        return res.status(400).json({ mensagem: "O telefone é obrigatório para registrar uma visita." });
    }

    const dbUsuarios = lerJSON(USUARIOS_DB, { jogadores: [] });
    let jogador = dbUsuarios.jogadores.find(j => j.telefone === telefoneLimpo);
    let cla_id = jogador ? jogador.cla_id : null;

    // Lógica para criação de novo clã
    if (novoCla && novoCla.membros && novoCla.membros.length > 0) {
        const dbClas = lerJSON(CLAS_DB, { familias: [] });
        const idFamilia = Date.now();
        const nomeMembroPrincipal = nomeCompleto || (jogador ? jogador.nomeCompleto : 'Líder');
        const novaFamilia = {
            id: idFamilia,
            nome_familia: `Família de ${nomeMembroPrincipal}`,
            membros: [{ nome: nomeMembroPrincipal, telefone: telefoneLimpo }, ...novoCla.membros]
        };
        dbClas.familias.push(novaFamilia);
        fs.writeFileSync(CLAS_DB, JSON.stringify(dbClas, null, 2));
        cla_id = idFamilia;
    }

    // Se o jogador não existe, cria um novo registro
    if (!jogador) {
        const alunoInfo = baseAlunos.find(aluno => limparTelefone(aluno.TELEFONE) === telefoneLimpo);
        const ehAluno = !!alunoInfo;
        let nomeFinal, nomeExibicaoDefault;
        
        if (ehAluno) {
            nomeFinal = `${alunoInfo.NOME || ''} ${alunoInfo.SOBRENOME || ''}`.trim();
            const sobrenome = (alunoInfo.SOBRENOME || '').split(' ')[0];
            nomeExibicaoDefault = `${alunoInfo.NOME || ''} ${sobrenome}`.trim();
        } else {
            nomeFinal = nomeCompleto || 'Aventureiro';
            nomeExibicaoDefault = nomeCompleto || 'Aventureiro';
        }
        
        jogador = {
            telefone: telefoneLimpo,
            nomeCompleto: nomeFinal,
            nickname: nickname || nomeExibicaoDefault,
            ehAluno,
            contador_visitas: 0,
            nivel: 1,
            moedas_ouro: 0,
            xp_para_proximo_nivel: xpPorNivel(1),
            cla_id: cla_id,
            historicoVisitas: []
        };
        dbUsuarios.jogadores.push(jogador);
    } else {
        // Garante que jogadores antigos tenham os campos de gamificação
        jogador.nivel = jogador.nivel || 1;
        jogador.moedas_ouro = jogador.moedas_ouro || 0;
        jogador.xp_para_proximo_nivel = jogador.xp_para_proximo_nivel || xpPorNivel(jogador.nivel);
        if (cla_id) {
            jogador.cla_id = cla_id;
        }
    }
    
    if (nickname) jogador.nickname = nickname;

    // Lógica de gamificação
    const moedasGanhadas = calcularRecompensa(jogador.nivel);
    jogador.moedas_ouro += moedasGanhadas;
    let subiuDeNivel = false; // FLAG para informar ao frontend

    while (jogador.moedas_ouro >= jogador.xp_para_proximo_nivel) {
        subiuDeNivel = true;
        jogador.nivel++;
        jogador.xp_para_proximo_nivel = xpPorNivel(jogador.nivel);
    }

    jogador.contador_visitas++;
    jogador.historicoVisitas.push({
        data: new Date().toISOString(),
        interesses: interesses || [],
        membrosPresentes: membrosPresentes || [],
        moedasGanhadas: moedasGanhadas
    });

    fs.writeFileSync(USUARIOS_DB, JSON.stringify(dbUsuarios, null, 2));

    const nomeExibicao = jogador.nickname || jogador.nomeCompleto;
    let mensagemGamificacao = `Visita Nº ${jogador.contador_visitas} registrada! Você ganhou ${moedasGanhadas} moedas de ouro.`;
    if (subiuDeNivel) {
        mensagemGamificacao += ` E PARABÉNS! Você alcançou o Nível ${jogador.nivel}!`;
    }

    res.status(200).json({
        nome: nomeExibicao,
        mensagemGamificacao,
        subiuDeNivel, // NOVO CAMPO
        jogador: {
            nivel: jogador.nivel,
            moedas_ouro: jogador.moedas_ouro,
            xp_para_proximo_nivel: jogador.xp_para_proximo_nivel
        }
    });
});

// 5. ENDPOINTS DE RELATÓRIOS E RANKING
// -----------------------------------------------------------------------------

app.get('/relatorios/ranking/individual', (req, res) => {
    const db = lerJSON(USUARIOS_DB, { jogadores: [] });
    
    const ranking = db.jogadores
        .map(j => ({
            nome: j.nickname || j.nomeCompleto,
            score: j.moedas_ouro || 0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    res.json(ranking);
});

app.get('/relatorios/ranking/clas', (req, res) => {
    const dbUsuarios = lerJSON(USUARIOS_DB, { jogadores: [] });
    const dbClas = lerJSON(CLAS_DB, { familias: [] });

    const ranking = dbClas.familias.map(cla => {
        let totalMoedas = 0;
        cla.membros.forEach(membro => {
            const jogador = dbUsuarios.jogadores.find(j => j.telefone === limparTelefone(membro.telefone));
            if (jogador) {
                totalMoedas += jogador.moedas_ouro || 0;
            }
        });
        return {
            nome_cla: cla.nome_familia,
            score: totalMoedas,
        };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    res.json(ranking);
});

// 6. INICIALIZAÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 Online em: ${PORT}!`);
});