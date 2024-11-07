const app = require('../express.js');
const pool = require('../db.js');

app.get('/getTeam/:id' , async (req  ,res)=>{
    const connection=await pool.getConnection()
    try{
        const orgId=req.params.id
        await connection.beginTransaction()
        const response=await connection.execute("select * from user where orgid=?", [orgId])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(401).send({error:error})
    }
    finally{
        if(connection) await connection.release()
    }
} )

app.get('/allOrganization' , async (req , res)=>{
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from organization')
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/allusers' , async (req , res)=>{
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from user')
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/allusers' , async (req , res)=>{
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from user')
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/allusers/:orgid' , async (req , res)=>{
    const orgId=req.params.orgid
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from user where orgid=?' , [orgId])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.post('/addTask' , async (req , res)=>{
    console.warn("Add task called")
    console.warn(req.body)
    const taskid= await generateUniqueTaskId()
    const connection=await pool.getConnection()
    const date=new Date()
    console.warn(taskid, req.body.taskName, req.body.assignedBy ,date , req.body.deadline , req.body.taskStatus , req.body.hoursTracked , req.body.startTime , req.body.endTime , req.body.userId , req.body.orgid)
    try{
        await connection.beginTransaction()
        const response=await connection.execute('insert into task (taskid , taskname , assignedby , assignedat , deadline , taskstatus , hourstracked , starttime , endtime , userid , orgid) values(?,?,?,?,?,?,?,?,?,?,?)' , [taskid, req.body.taskName, req.body.assignedBy ,date , req.body.deadline , req.body.taskStatus , req.body.hoursTracked , req.body.startTime , req.body.endTime , req.body.userId , req.body.orgid])
        res.status(200).send({data:`Task Assigned Successfully`})
        await connection.commit()
    }catch(error){
        console.warn(error)
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/getUserTask/:userId' , async (req , res)=>{
    const userId=req.params.userId
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from task where userid=?' , [userId])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/getOrgTask/:orgId', async (req, res) => {
    const orgid = req.params.orgId;
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
                t.orgid = ?;`,
            [orgid]
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
});






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

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}