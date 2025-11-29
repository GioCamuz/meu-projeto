const http = require("http");
const express = require("express");
const app = express();
const port = process.env.PORT ||3000;
const bcrypt = require("bcrypt");
const { getPool, sql } = require('./connection');

const cors = require("cors");

app.use(cors({
  origin: "*",
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization"
}));


//Middleware para ler JSON no corpo da requisição
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Função para validar data
function isValidDateString(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
}

//Realizar consultas no SQL

async function execSQLQueryParams(query, params = {}) {
    const pool = await getPool();
    const request = pool.request();

    for (const [key, value] of Object.entries(params)) {
        let finalValue = value;

        // Tratar null, undefined, 'null', 'undefined', ''
        if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
            request.input(key, sql.VarChar, null);
            continue;
        }

        // Determina o tipo SQL
        const sqlType = getSQLType(value);
        if (!sqlType) {
            throw new message(`Tipo SQL inválido para o parâmetro "${key}": ${value}`);
        }

        // Converter strings de data
        if (sqlType === sql.DateTime && typeof value === 'string') {
            finalValue = new Date(value);
        }

        request.input(key, sqlType, finalValue);
    }

    const result = await request.query(query);

    // Retorna o último recordset (para INSERT + SCOPE_IDENTITY)
    if (result.recordsets && result.recordsets.length > 1) {
        return result.recordsets[result.recordsets.length - 1];
    }

    return result.recordset || [];
}

// Determina tipo SQL
function getSQLType(value) {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? sql.Int : sql.Float;
    }
    if (value instanceof Date) {
        return sql.DateTime;
    }
    if (typeof value === 'string' && isValidDateString(value)) {
        return sql.DateTime;
    }
    if (typeof value === 'boolean') {
        return sql.Bit;
    }

    return sql.VarChar;
}



//Consultar todos os logins

app.get('/users', async (req, res) => {
    const aUsers = await execSQLQueryParams('SELECT * FROM users');

    if (!aUsers.length) {
        res.status(400).json({ message: 'Não existe usuários' });
    }

    return res.status(200).json(aUsers);
});

//Adicionando um novo login

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'É necessário preencher todos os campos!' });
    }
    
    const loginExist = await execSQLQueryParams(`SELECT * FROM users WHERE email= @email`
                                               , { email }
                                               );
    if (loginExist.length) {
        return res.status(400).json({ message: 'E-mail já cadastrado!' });
        console.log("email existe"+ email);
        
    }
        

    await execSQLQueryParams(`INSERT INTO users(email, password) VALUES(@email, @password)`
                            ,{ email, password }
                            );

    res.status(201).json({ message: 'Dados de login inseridos!' });
});


//Consultar login para acesso

app.post('/login', async (req, res) => {

    const { email, password } = req.body;

    const userExist = await execSQLQueryParams(`SELECT * FROM users WHERE email= @email AND password= @password`
                                               , {email, password}
                                              );

    if (!userExist.length) {

        return res.status(400).json({ message: 'Login ou senha inválidos!' });

    }

    return res.status(200).json({user_id: userExist[0].id, message: 'Login realizado!'});
});

//Trocar de senha de login

app.put('/login/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { email, password } = req.body;

    if (!id) {

        return res.status(400).json({ message: 'ID não informado.' });

    }
    const idExist = await execSQLQueryParams(`SELECT * FROM users WHERE id= @id`
                                            , { id }
                                            );

    if (!idExist.length) {

        return res.status(400).json({ message: 'ID não encontrado!' });

    }
    const userExist = await execSQLQueryParams(`SELECT * FROM users WHERE id= @id AND email= @email`
                                              , { id , email }
                                              );

    if (!userExist.length) {

        return res.status(400).json({ message: 'Email não encontrado!' })
    }

    await execSQLQueryParams(`UPDATE users SET password= @password WHERE id= @id`
                            , { password, id }
                            );

    return res.status(200).json({ message: 'Senha atualizada!' });
});


//Consultar tasks do Usuario
app.get('/tasks', async (req, res) => {
    const user_id = Number(req.query.user_id);
    const aTasks = await execSQLQueryParams(`SELECT * FROM tasks WHERE user_id= @user_id`
                                           , { user_id }
                                           ) || [];
  console.log(aTasks);
    if (!aTasks.length) {

        return res.status(400).json({ message: 'Usuário não possuí tarefas!' });

    }

    return res.status(200).json(aTasks);

});

//Criar tarefas

app.post('/tasks', async (req, res) => {
    const { user_id, name, priority, status, completed_at } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'ID user não informado!' });
    }


   const result = await execSQLQueryParams(`
        INSERT INTO tasks(user_id, name, priority, status, completed_at)
        VALUES (@user_id, @name, @priority, @status, @completed_at)
        SELECT SCOPE_IDENTITY() AS id;`
        , { user_id, name, priority, status, completed_at } 
        );

    const insertedId = result[0].id;
  
    res.status(201).json({ id: insertedId, message: 'Task incluida com sucesso'});
});

//Alterar dados da task

app.put('/tasks/:id', async (req, res) => {
    const taskId = Number(req.params.id);
    if (!taskId) {
        return res.status(400).json({ message: 'ID da tarefa não informado!' })
    }
    const { name, priority, status, completed_at } = req.body;

    const taskExist = await execSQLQueryParams(`SELECT * FROM tasks WHERE id=@taskId`
                                              , { taskId } 
                                              );
 
    if (!taskExist.length) {
        return res.status(400).json({ message: 'Task não encontrada!' });
    }
    await execSQLQueryParams(`
        UPDATE tasks
        SET name= @name, priority= @priority, status= @status, completed_at= @completed_at 
        WHERE id= @taskId`
        , { name, priority, status, completed_at, taskId } 
        );

    return res.status(200).json({ message: 'Dados atualizados!' });
});


//Deletar Tasks

app.delete('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;

    if (!taskId) {
        return res.status(400).json({ message: 'ID das tarefas não encontrado' });
    }

    await execSQLQueryParams(`DELETE FROM tasks WHERE id= @taskId`
                            , {taskId}
                            );

    return res.status(204).json({message: 'Task deletada!' });    
})



app.listen(port, () => console.log(`Servidor rodando local na porta ${port}`));
