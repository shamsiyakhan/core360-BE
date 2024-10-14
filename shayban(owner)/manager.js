const app = require('../express.js');
const pool = require('../db.js');
const sgMail = require('@sendgrid/mail');

const key=require('dotenv').config(); // Load environment variables from .env
const sendGridApiKey = process.env.SENDGRID_API_KEY;
    sgMail.setApiKey(sendGridApiKey);
 


app.post('/addManager' , async (req , res)=>{
    const userId=await generateUniqueUserId()
    const date = new Date()
    const connection =await pool.getConnection()
    try{
       await connection.beginTransaction();
        const response = await connection.execute('INSERT INTO user (userid, email,createdat , modifiedat , orgid, roleid , status) VALUES (?, ?, ?, ? , ? , ?, ?)',[userId, req.body.email, date , date , req.body.orgid,  '102' , 'inActive']);
        await connection.commit()
        res.status(200).send({data:"Manager Added"})
        const text = 'Please Click On the following link to Enter the detail and activate your account <br> ' +   `<a href="http://localhost:4200/auth/signup/activateAccount?id=${userId}" target="_blank">Activate Account</a>`;
        await sendEmail(req.body.email , "Activate Account" ,'Activate account by clicking on following link' ,  text )
    }
    catch(error){
       await connection.rollback()
       console.warn(error)
       res.status(401).send({error:error})
    }
    finally{
        if (connection) connection.release();  
    }
})

app.post('/getUser' , async (req , res)=>{
    const connection =await pool.getConnection();
    try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from user where userid=?' , [req.body.id])
        console.warn(response[0])
        if(response[0].length>0){
            res.status(200).send(response[0])
        }else{
            res.status(401).send({error:"Invalid Token"})
        }
        await connection.commit()
       
    }
    catch(error){
        await connection.rollback();
        res.status(500).send("Detail fetched successfully")
    }
})


app.post('/addEmployee' , async (req , res)=>{
    const userId=await generateUniqueUserId()
    const date = new Date()
    const connection =await pool.getConnection()
    try{
       await connection.beginTransaction();
        const response = await connection.execute('INSERT INTO user (userid, email,createdat , modifiedat , orgid, roleid , status) VALUES (?, ?, ?, ? , ? , ? , ?)',[userId, req.body.email, date , date , req.body.orgid,  '103' , 'inActive']);
        await connection.commit()
        res.status(200).send({data:"Manager Added"})
        const text = 'Please Click On the following link to Enter the detail and activate your account' +   `<a href="http://localhost:4200/auth/signup/activateAccount?id=${userId}">Activate Account</a>`;
        await sendEmail(req.body.email , "Activate Account" ,'Activate account by clicking on following link' ,  text )
    }
    catch(error){
       await connection.rollback()
       console.warn(error)
       res.status(401).send({error:error})
    }
    finally{
        if (connection) connection.release();  
    }
})

app.post('/update-registration' , async(req , res)=>{
    console.warn("update registration called")
    const date=new Date()
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction();
        connection.execute('update user set username=? , password=? , address=? , dob=? , modifiedat=? , status=? where userid=?' , [req.body.username , req.body.password , req.body.address , req.body.dob , date , 'active' , req.body.userid])
        connection.commit()
        res.status(200).send({data:"Onboarding Successfull You Can login with your credentials"})
    }
    catch(error){
        connection.rollback()
        res.status(401).send({error:error})
    }
    finally{
        if(connection) connection.release()
    }
})



async function generateUniqueUserId() {
    let user_id = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM user WHERE userid = ?', [user_id]);
        if (rows.length === 0) {
            exists = false;
        } else {
            user_id = generateUniqueId(); 
        }
    }
    return user_id;
}

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}



// Function to send email
async function sendEmail(toEmail, subject, textContent, htmlContent) {
    console.warn("trying to send email")
    const msg = {
        to: toEmail, 
        from: 'sehrozkhan2704@gmail.com', 
        subject: subject,
        text: textContent, 
        html: htmlContent, 
    };

    try {
        const response = await sgMail.send(msg);
        console.log('Email sent successfully:');
    } catch (error) {
        console.error('Error sending email:', error.response ? error.response.body : error.message);
    }
}