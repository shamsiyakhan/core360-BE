const app = require('../express.js');
const pool = require('../db.js');
const sgMail = require('@sendgrid/mail');

const key = require('dotenv').config(); // Load environment variables from .env
const sendGridApiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(sendGridApiKey);

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

        const [userRows] = await connection.execute(
            'SELECT email FROM user WHERE userid = ?',
            [req.body.userId]
        );

        if (userRows.length > 0) {
            const userEmail = userRows[0].email;

            // Send an email using SendGrid
            const msg = {
                to: userEmail,
                from: 'sehrozkhan2704@gmail.com', // Replace with your verified SendGrid sender email
                subject: 'New Task Assigned to You on Core360',
                text: `Hello, a new task titled "${req.body.taskName}" has been assigned to you. Please check your Core360 account for details.`,
                html: `<p>Hello,</p><p>A new task titled "<strong>${req.body.taskName}</strong>" has been assigned to you. Please check your Core360 account for details.</p>`
            };

            await sgMail.send(msg);
            console.log(`Email sent to ${userEmail}`);
        }
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

app.post("/addCategory/:orgId" , async (req , res)=>{
    const orgId=req.params.orgId
    const categoryId= await generateUniqueCategoryId()
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('insert into category (categoryid , categoryname , orgid) values(?,?,?)' , [categoryId , req.body.categoryname , orgId])
        res.status(200).send({data:`Category Added Successfully`})
        await connection.commit()
    }catch(error){
        console.warn(error)
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get('/categories/:orgid' , async (req , res)=>{
    const orgid=req.params.orgid
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from category where orgid=?' , [orgid])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.post("/addInventory/:orgId" , async (req , res)=>{
    const inventId= await generateUniqueInventoryId()
    const orgId=req.params.orgId
    const connection=await pool.getConnection()
    console.warn(inventId)
    console.warn(orgId)
    console.warn(req.body)
    try{
        await connection.beginTransaction()
        const response=await connection.execute('insert into inventory (inventid , inventcategory , inventname , price , details , stock , orgid ) values(?,?,?,?,?,?,?)' , [inventId, req.body.inventcategory, req.body.inventname ,req.body.price , req.body.details , req.body.stock ,  orgId])
        res.status(200).send({data:`Inventory Added Successfully`})
        await connection.commit()
    }catch(error){
        console.warn(error)
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.get("/getInventory/:orgid" , async (req ,res)=>{
    const orgid=req.params.orgid
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from inventory where orgid=?' , [orgid])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.post("/updateInventory/:id", async (req, res) => {
    const inventid = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const response = await connection.execute(
            'UPDATE inventory SET inventcategory = ?, inventname = ?, price = ?, details = ?, stock = ? WHERE inventid = ?',
            [req.body.inventcategory, req.body.inventname, req.body.price, req.body.details, req.body.stock, inventid]
        );
        res.status(200).send({ data: `Inventory Updated Successfully` });
        await connection.commit();
    } catch (error) {
        console.warn(error);
        await connection.rollback();
        res.status(400).send({ error: error });
    } finally {
        if (connection) await connection.release();
    }
});

app.delete("/deleteInventory/:id", async (req, res) => {
    const inventid = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const response = await connection.execute(
            'delete from inventory where inventid=?' , [inventid]
        );
        res.status(200).send({ data: `Inventory Deleted Successfully` });
        await connection.commit();
    } catch (error) {
        console.warn(error);
        await connection.rollback();
        res.status(400).send({ error: error });
    } finally {
        if (connection) await connection.release();
    }
});


app.post("/addCampaign/:orgId" , async (req , res)=>{
    const campaignId= await generateUniqueCampaignId()
    const orgId=req.params.orgId
    const date=new Date()
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        console.warn(orgId)
        console.warn(campaignId)
        const response=await connection.execute('insert into marketing (marketing_id , campaign_name , clicks , conversion , created_at  , orgid ) values(?,?,?,?,?,?)' , [campaignId, req.body.campaign_name ,0 ,0 , date ,  orgId])
        res.status(200).send({data:`Marketing Added Successfully`})
        await connection.commit()
    }catch(error){
        console.warn(error)
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})

app.post("/trackClick/:marketing_id", async (req, res) => {
    const marketingId = req.params.marketing_id;
    const date = new Date();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Fetch the current number of clicks for the given marketing_id
        const [rows] = await connection.execute(
            'SELECT clicks FROM marketing WHERE marketing_id = ?',
            [marketingId]
        );

        if (rows.length === 0) {
            return res.status(404).send({ error: "Marketing ID not found" });
        }

        // Increment the clicks count
        const currentClicks = rows[0].clicks;
        const updatedClicks = currentClicks + 1;

        // Update the clicks in the database
        await connection.execute(
            'UPDATE marketing SET clicks = ? WHERE marketing_id = ?',
            [updatedClicks, marketingId]
        );

        await connection.commit();
        res.status(200).send({ data: `Click count updated successfully` });
    } catch (error) {
        console.warn(error);
        await connection.rollback();
        res.status(400).send({ error: error.message });
    } finally {
        if (connection) await connection.release();
    }
});


app.post("/trackConversion/:marketing_id", async (req, res) => {
    const marketingId = req.params.marketing_id;
    const date = new Date();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Fetch the current number of clicks for the given marketing_id
        const [rows] = await connection.execute(
            'SELECT conversion FROM marketing WHERE marketing_id = ?',
            [marketingId]
        );

        if (rows.length === 0) {
            return res.status(404).send({ error: "Marketing ID not found" });
        }

        // Increment the clicks count
        const currentConversion = rows[0].conversion;
        const updatedConversion = currentConversion + 1;

        // Update the clicks in the database
        await connection.execute(
            'UPDATE marketing SET conversion = ? WHERE marketing_id = ?',
            [updatedConversion, marketingId]
        );

        await connection.commit();
        res.status(200).send({ data: `Conversion count updated successfully` });
    } catch (error) {
        console.warn(error);
        await connection.rollback();
        res.status(400).send({ error: error.message });
    } finally {
        if (connection) await connection.release();
    }
});


app.get('/getCampaigns/:orgid' , async (req , res)=>{
    const orgid=req.params.orgid
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from marketing where orgid=?' , [orgid])
        res.status(200).send({data:response[0]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(400).send({error:error})
    }finally{
        if(connection) await connection.release()
    }
})



async function generateUniqueCampaignId() {
    let marketing_id = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM marketing WHERE marketing_id = ?', [marketing_id]);
        if (rows.length === 0) {
            exists = false;
        } else {
            marketing_id = generateUniqueId(); 
        }
    }
    return marketing_id;
}


async function generateUniqueInventoryId() {
    let inventid = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM inventory WHERE inventid = ?', [inventid]);
        if (rows.length === 0) {
            exists = false;
        } else {
            inventid = generateUniqueId(); 
        }
    }
    return inventid;
}

async function generateUniqueCategoryId() {
    let inventid = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM category WHERE categoryid = ?', [inventid]);
        if (rows.length === 0) {
            exists = false;
        } else {
            inventid = generateUniqueId(); 
        }
    }
    return inventid;
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

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}