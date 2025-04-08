// app.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();

// Configuração da conexão com o banco de dados
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'MeuBancoDeDados',
  port: 3306
});

connection.connect(err => {
  if (err) {
    console.error("Erro ao conectar no banco:", err);
    return;
  }
  console.log("Conexão com o banco realizada com sucesso!");
});

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração das sessions
app.use(session({
  secret: 'mysecretkey', // altere para uma chave segura em produção
  resave: false,
  saveUninitialized: false
}));

// Define a pasta "public" como contendo os arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------
// Rotas de autenticação (login)
// ------------------------------------------------

// Página de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Processa o login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  connection.query(
    'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
    [email, senha],
    (err, results) => {
      if (err) {
        console.error("Erro ao executar a consulta:", err);
        return res.status(500).send("Erro interno no servidor.");
      }
      if (results.length > 0) {
        req.session.user = results[0];
        // Após login, redireciona para a página de cadastro (home.html)
        res.sendFile(path.join(__dirname, 'public', 'home.html'));
      } else {
        res.send(`
          <h1>Login</h1>
          <p style="color:red;">Credenciais inválidas. Tente novamente.</p>
          <form method="POST" action="/login">
              <label>Email:</label>
              <input type="text" name="email" required /><br/><br/>
              <label>Senha:</label>
              <input type="password" name="senha" required /><br/><br/>
              <button type="submit">Entrar</button>
          </form>
        `);
      }
    }
  );
});

// Middleware de autenticação para as rotas protegidas
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).send("Você precisa estar logado para acessar essa rota.");
}

// ------------------------------------------------
// Rotas de CRUD para produtos (associados ao usuário logado)
// ------------------------------------------------

// Listar produtos do usuário (usada na loja.html)
app.get('/products', isAuthenticated, (req, res) => {
  const usuario_id = req.session.user.id;
  connection.query('SELECT * FROM produtos WHERE usuario_id = ?', [usuario_id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar produtos:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
    res.json(results);
  });
});

// Adicionar um produto (chamada via fetch da home.html)
app.post('/products', isAuthenticated, (req, res) => {
  const { nome, descricao, preco, quantidade, imagem } = req.body;
  const usuario_id = req.session.user.id;
  connection.query(
    'INSERT INTO produtos (nome, descricao, preco, quantidade, imagem, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, descricao, preco, quantidade, imagem, usuario_id],
    (err, result) => {
      if (err) {
        console.error("Erro ao inserir produto:", err);
        return res.status(500).json({ error: "Erro interno" });
      }
      res.json({
        id: result.insertId,
        nome, descricao, preco, quantidade, imagem, usuario_id
      });
    }
  );
});

// Atualizar um produto (via PUT)
app.put('/products/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, quantidade, imagem } = req.body;
  const usuario_id = req.session.user.id;
  connection.query('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?', [id, usuario_id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar produto:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado ou não autorizado" });
    }
    connection.query(
      'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, quantidade = ?, imagem = ? WHERE id = ?',
      [nome, descricao, preco, quantidade, imagem, id],
      (err2, result) => {
        if (err2) {
          console.error("Erro ao atualizar produto:", err2);
          return res.status(500).json({ error: "Erro interno" });
        }
        res.json({ message: "Produto atualizado com sucesso" });
      }
    );
  });
});

// Deletar um produto
app.delete('/products/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const usuario_id = req.session.user.id;
  connection.query('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?', [id, usuario_id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar produto:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado ou não autorizado" });
    }
    connection.query('DELETE FROM produtos WHERE id = ?', [id], (err2, result) => {
      if (err2) {
        console.error("Erro ao deletar produto:", err2);
        return res.status(500).json({ error: "Erro interno" });
      }
      res.json({ message: "Produto removido com sucesso" });
    });
  });
});

// Inicia o servidor na porta 8083
app.listen(8083, () => {
  console.log("Servidor rodando em http://localhost:8083");
});
