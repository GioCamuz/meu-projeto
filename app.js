const http = require("http");
const express = require("express");
const app = express();
const port = 3000;
const bcrypt = require("bcrypt");
const { getPool } = require('./connection');



//Middleware para ler JSON no corpo da requisição
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//Realizar consultas no SQL

async function execSQLQuery(sqlQry) {
    const pool = await getPool();
    const { recordset } = await pool.request().query(sqlQry);
    return recordset;
}

//Consultar todos os logins

app.get('/login', async (req, res) => {
    const aUsers = await execSQLQuery('SELECT * FROM users');

    if (!aUsers.length) {
        res.status(400).json({ error: 'Não existe usuários' });
    }

    return res.status(200).json(aUsers);
});

//Adicionando um novo login

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email && !password) {
        return res.status(400).json({ error: 'É necessário preencher todos os campos!' });
    }
    console.log(email);
    const loginExist = await execSQLQuery(`SELECT * FROM users WHERE email='${email}'`);
    if (loginExist.length) {
        return res.status(400).json({ error: 'E-mail já cadastrado!' });
        console.log("email existe"+ email);
        
    }
        console.log("email nao existe"+email);

    await execSQLQuery(`INSERT INTO users(email, password) VALUES('${email}','${password}')`)

    res.status(200).json({ message: 'Dados de login inseridos!' });
});


//Consultar login para acesso

app.get('/login', async (req, res) => {

    const { email, password } = req.body;

    const userExist = await execSQLQuery(`SELECT * FROM user WHERE id=${id} AND email=${email} AND password=${password}`);

    if (!userExist.length) {

        return res.status(400).json({ error: 'Login ou senha inválidos!' });

    }

    return res.status(200).json({ message: 'Login realizado!' });
});

//Trocar de senha de login

app.put('/login/:id', async (req, res) => {
    const id = req.params.id;
    const { email, password } = req.body;

    if (!id) {

        return res.status(400).json({ error: 'ID não informado.' });

    }
    const idExist = await execSQLQuery(`SELECT * FROM users WHERE id=${id}`);

    if (!idExist.length) {

        return res.status(400).json({ error: 'ID não encontrado!' });

    }
    const userExist = await execSQLQuery(`SELECT * FROM users WHERE id=${id} AND email='${email}'`);

    if (!userExist.length) {

        return res.status(400).json({ error: 'Email não encontrado!' })
    }

    await execSQLQuery(`UPDATE users SET password= '${password}' WHERE id=${id}`);

    return res.status(200).json({ message: 'Senha atualizada!' });
});


//Consultar tasks do Usuario
app.get('/tasks', async (req, res) => {
    const { user_id } = req.query;
    const aTasks = await execSQLQuery(`SELECT * FROM tasks WHERE user_id=${user_id}`);

    if (!aTasks.length) {

        return res.status(400).json({ error: 'Usuário não possuí tarefas!' });

    }

    return res.status(200).json(aTasks);

});

//Criar tarefas

app.post('/tasks', async (req, res) => {
    const { user_id, name, priority, status, completed_at } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'ID user não informado!' });
    }

    const created_at = new Date();
    
    await execSQLQuery(`
        INSERT INTO tasks(user_id, name, priority, status, created_at, completed_at) 
        VALUES (${user_id},'${name}','${priority}', '${status}', '${created_at}', '${completed_at}')`);
        
    res.status(200).json({ message: 'Task incluida com sucesso' });
});

//Alterar dados da task

app.put('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    if (!taskId) {
        return res.status(400).json({ error: 'ID da tarefa não informado!' })
    }
    const { name, priority, status, created_at, completed_at } = req.body;

    const taskExist = await execSQLQuery(`SELECT * FROM tasks WHERE id=${taskId}`);
 
    if (!taskExist.length) {
        return res.status(400).json({ error: 'Task não encontrada!' });
    }
    await execSQLQuery(`
        UPDATE tasks
        SET name='${name}', priority='${priority}', status='${status}', created_at='${created_at}', completed_at='${completed_at}' 
        WHERE id=${taskId}`);

    return res.status(200).json({ message: 'Dados atualizados!' });
});


//Deletar Tasks

app.delete('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;

    if (!taskId) {
        return res.status(400).json({ error: 'ID das tarefas não encontrado' });
    }

    await execSQLQuery(`DELETE tasks WHERE id=${taskId}`);

    return res.status(200).json({ response: 'Task deletada!' });    
})



http.createServer(app).listen(port, () => console.log("Servidor rodando local na porta 3000"));
