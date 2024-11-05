//import express section
const pool = require('../../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app = require('../../express.js')
const sgMail = require('@sendgrid/mail');

const key = require('dotenv').config(); // Load environment variables from .env
const sendGridApiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(sendGridApiKey);

app.get('/', (req, res) => {
    res.send({ data: 'api created' })
})
/* forget password api here */
app.post('/forgot', async (req, res) => {
    console.warn(req.body.email)


    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('select * from user where email=?', [req.body.email])
        console.warn(result)
        if (result.length == 0) {
            res.send({ error: 'couldnt find account' })
        } else {
            const otp = generateOTP()
            const resp = insertOtp(req.body.email, otp)

            if (resp) {
                sendOtp(req.body.email, otp)
                res.send({ data: 'otp send successfully' })

            } else {
                res.send({ error: "cannot send otp" })
            }

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

//verify otp api here
app.post('/verifyOtp', async (req, rep) => {
    console.warn(req.body.otp)
    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();
        const [result] = await connection.execute('select * from otp where email=? and otp=?', [req.body.email, req.body.otp])
        if (result.length == 0) {
            rep.send({ error: 'Invaild Otp' })
        } else {
            rep.send({ data: 'Otp Verified Successfully' })
        }
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        rep.send('Error')

    } finally {
        if (connection) await connection.release();
    }
})

// user update password api here add here
app.post('/updatePassword', async (req, rep) => {
    console.warn(req.body.password)
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('update user set password=? where email=?', [req.body.password, req.body.email])
        if (result.length == 0) {
            rep.send({ error: 'Cannot Update Password' })
        } else {
            rep.send({ data: 'Password Update Successfully' })
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        rep.send('error')
    } finally {
        if (connection) await connection.release();
    }
})
// generate otp here
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
}
function sendOtp(email, otp) {
    const sendEmail = async () => {
        const msg = {
            to: email,
            from: 'sehrozkhan2704@gmail.com', // Your verified SendGrid sender email
            subject: 'subject',
            text: otp,
            html: otp,
        };

        try {
            await sgMail.send(msg);
            console.log('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
            if (error.response) {
                console.error(error.response.body);
            }
        }
    };

    sendEmail();
}


async function insertOtp(email, otp) {
    const connection = await pool.getConnection();
    console.warn(connection);

    try {
        await connection.beginTransaction();

        const organizationResult = await connection.execute(
            'INSERT INTO otp VALUES (?, ?)',
            [email, otp]
        );

        await connection.commit();

        console.log('otp send successfully');
        return
    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        return false
    } finally {
        if (connection) connection.release();
    }
}



/* inventory api here */



app.get('/inventory/:id', async (req, res) => {
    console.warn(req.params.id)
    const organizationId=req.params.id


    const connection = await pool.getConnection();
    try{
        await connection.beginTransaction();
        const response=await connection.execute("select * from inventory where orgid=?",[organizationId]);
        await connection.commit();
        res.status(200).send({data:response[0]})
    }
        catch{
            await connection.rollback()
            res.status(401).send({error:'Faild To Get Values'})

    }
    finally{
        if(connection) await connection.release()

    }
   

})

app.post('/addinventory',async (req,res)=>{

    const connection=await pool.getConnection();
    const orgid=generateUniqueInventoryId()
    try{
        await connection.beginTransaction();
        const response=await connection.execute('insert into inventory(inventid,inventcategory,inventname,price,details,stock,orgid)values(?,?,?,?,?,?,?)',[orgid,req.body.category,name,price,details,stock,orgid])
        await connection.commit();
        res.status(200).send({data:response[0]})
    }
    catch{

        await connection.rollback();
        res.status(401).send({error:'Faild data'})
    }
    finally{
        if(connection) await connection.release()
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

async function generateUniqueInventoryId() {
    let team_id = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM inventory WHERE inventid = ?', [team_id]);
        if (rows.length === 0) {
            exists = false;
        } else {
            team_id = generateUniqueId(); 
        }
    }
    return team_id;
}

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}