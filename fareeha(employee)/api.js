console.warn('api func called')
//import express section
const pool = require('../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app = require('../express.js')
const jwt=require('jsonwebtoken')
const secretkey='12345@core360'
app.get('/', (req, res) => {
    res.send({ data: 'api created' })
})

app.post('/login', async (req, res) => {
    console.warn(req.body.email)
    const connection = await pool.getConnection();
    console.warn(connection);
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('select * from user where email=? and password=?', [req.body.email, req.body.password])
        console.warn(result[0])
        if (result.length == 0) {
            res.send({ error: 'Invalid Credential' })
        } else {
            res.send({ data: await generateToken(result[0]) })
            
        }


        await connection.commit();


    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Transaction failed' });
    } finally {
        if (connection) connection.release();
    }

})

app.post('/addTask', async (req, res) => {



        const connection = await pool.getConnection();
        const date = new Date();
        try {
            const taskid = await generateUniqueTaskId();
            await connection.beginTransaction();
            const response = await connection.execute(
                `INSERT INTO task (taskid, taskname, assignedby, assignedat, deadline, taskstatus, hourstracked, starttime, endtime, userid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    taskid,
                    req.body.taskname,
                    req.body.assignedby,
                    date,
                    req.body.deadline,
                    req.body.taskstatus,
                    req.body.hourstracked,
                    req.body.starttime,
                    req.body.endtime,
                    req.body.userid,
                ]
            );
            await connection.commit();
            res.status(200).send({
                data: "Task added successfully"
            });
        } catch (error) {
            await connection.rollback();
            res.status(401).send({
                data: "Task addition failed"
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
   
});


app.get('/getTask/:id', async (req, res) => {
   
    const id = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Execute the query to get the task and user details
        const [response] = await connection.execute(
            `SELECT 
               t.*,
                u1.userid AS assignedby_id,
                u1.username AS assignedby_name,
                u1.email AS assignedby_email,
                u1.phonenumber AS assignedby_phonenumber,
                u2.userid AS userdetails_id,
                u2.username AS userdetails_name,
                u2.email AS userdetails_email,
                u2.phonenumber AS userdetails_phonenumber
            FROM 
                task t
            INNER JOIN 
                user u1 ON t.assignedby = u1.userid
            INNER JOIN 
                user u2 ON t.userid = u2.userid
            WHERE 
                t.userid = ?;`,
            [id]
        );

        console.warn('Raw Response:', response);  // Debugging: Check raw response

        // Restructure the response
        const response1 = response.map(row => ({
            taskId: row.taskid,
            taskName: row.taskname,
            taskStatus: row.taskstatus,
            deadline:row.deadline,
            assignedat: row.assignedat,
            hourstracked: row.hourstracked,
            starttime: row.starttime,
            endtime: row.endtime,
            progressStatus:row.inprogress,
            // Mapping assignedBy user (user who assigned the task)
            assignedBy: {
                userId: row.assignedby_id || null,
                userName: row.assignedby_name || null,
                email: row.assignedby_email || null,
                phoneNumber: row.assignedby_phonenumber || null
            },
            // Mapping userDetails (user to whom the task is assigned)
            userDetails: {
                userId: row.userdetails_id || null,
                userName: row.userdetails_name || null,
                email: row.userdetails_email || null,
                phoneNumber: row.userdetails_phonenumber || null
            }
        }));

        console.warn('Formatted Response:', response1);  // Debugging: Check formatted response

        // Send the structured response
        res.status(200).send({ data: response1 });

        // Commit the transaction
        await connection.commit();

    } catch (error) {
        // In case of error, rollback the transaction
        await connection.rollback();
        console.error('Error:', error);  // Debugging: Log the error
        res.status(400).send({ error: error.message });
    } finally {
        if (connection) await connection.release(); // Release the connection
    }

})

app.post("/start-task/:taskid" , async (req , res)=>{
    const taskId=req.params.taskid
    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');  // Get current date & time in 'YYYY-MM-DD HH:mm:ss' format
    const connection = await pool.getConnection();
    console.warn(connection);
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('update task set starttime=? , endtime=? , inprogress=? , taskstatus=?  where taskid=?', [currentDateTime, "" , true , "In Progress" ,taskId])
        console.warn(result[0])
       res.status(200).send({data:"Task Started"})


        await connection.commit();


    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Cannot Start Task' });
    } finally {
        if (connection) connection.release();
    }
})

app.post("/end-task/:taskid", async (req, res) => {
    const taskId = req.params.taskid;
    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');  // Get current date & time in 'YYYY-MM-DD HH:mm:ss' format
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Step 1: Fetch the starttime and hourstracked from the task
        const [task] = await connection.execute('SELECT starttime, hourstracked FROM task WHERE taskid = ?', [taskId]);

        if (task.length === 0) {
            return res.status(404).send({ error: 'Task not found' });
        }

        const starttime = task[0].starttime;
        let currentHourstracked = task[0].hourstracked || 0;

        // Ensure currentHourstracked is a number
        currentHourstracked = Number(currentHourstracked);

        // Step 2: Calculate the difference between current time and starttime in hours (in decimal format)
        const startDate = new Date(starttime);
        const endDate = new Date(currentDateTime);

        const differenceInMillis = endDate - startDate;  // Difference in milliseconds
        const differenceInHours = differenceInMillis / (1000 * 60 * 60);  // Convert milliseconds to hours

        // Ensure differenceInHours is a number
        const newHourstracked = currentHourstracked + differenceInHours;

        const [result] = await connection.execute(
            'UPDATE task SET endtime = ?, hourstracked = ?, inprogress = ? WHERE taskid = ?',
            [currentDateTime, newHourstracked.toFixed(2), false, taskId]  // Store value rounded to 2 decimal places
        );

        // Step 4: Commit the transaction
        await connection.commit();

        res.status(200).send({ data: 'Task ended and hours tracked updated' });

    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Cannot end task or update hours' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/completeTask/:taskid' , async (req , res)=>{
    const taskId=req.params.taskid;
    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const connection=await pool.getConnection()
    try {
        await connection.beginTransaction();

        // Step 1: Fetch the starttime and hourstracked from the task
        const [task] = await connection.execute('SELECT starttime, hourstracked FROM task WHERE taskid = ?', [taskId]);

        if (task.length === 0) {
            return res.status(404).send({ error: 'Task not found' });
        }

        const starttime = task[0].starttime;
        let currentHourstracked = task[0].hourstracked || 0;

        // Ensure currentHourstracked is a number
        currentHourstracked = Number(currentHourstracked);

        // Step 2: Calculate the difference between current time and starttime in hours (in decimal format)
        const startDate = new Date(starttime);
        const endDate = new Date(currentDateTime);

        const differenceInMillis = endDate - startDate;  // Difference in milliseconds
        const differenceInHours = differenceInMillis / (1000 * 60 * 60);  // Convert milliseconds to hours

        // Ensure differenceInHours is a number
        const newHourstracked = currentHourstracked + differenceInHours;

        const [result] = await connection.execute(
            'UPDATE task SET endtime = ?, hourstracked = ?, inprogress = ? , taskstatus=? WHERE taskid = ?',
            [currentDateTime, newHourstracked.toFixed(2), false, "Completed" , taskId]  // Store value rounded to 2 decimal places
        );

        // Step 4: Commit the transaction
        await connection.commit();

        res.status(200).send({ data: 'Task ended and hours tracked updated' });

    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Cannot end task or update hours' });
    } finally {
        if (connection) connection.release();
    }

})



function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
async function generateUniqueTaskId() {
    let taskid = generateUniqueId();
    let exists = true;

    while (exists) {
        const [rows] = await pool.query('SELECT * FROM task WHERE taskid = ?', [taskid]);
        if (rows.length === 0) {
            exists = false;
        } else {
            taskid = generateUniqueId();
        }
    }
    return taskid;
}


function generateToken(user){
    const jwtToken=jwt.sign({username:user.username , userid:user.userid , orgid:user.orgid} , secretkey , {expiresIn:'1h'})
    user={...user , jwt:jwtToken}
    return user;
}
