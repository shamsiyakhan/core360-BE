const app = require('../express.js');
const pool = require('../db.js');

// POST endpoint for signup
app.post('/signup', async (req, res) => {
    console.warn(req.body);
    
    const organization_id = await generateUniqueOrganizationId(); 
    const user_id = await generateUniqueUserId(); 
    const today = new Date();

    const connection = await pool.getConnection(); 
    console.warn(connection);
    
    try {
        await connection.beginTransaction();

        const organizationResult = await connection.execute(
            'INSERT INTO organization VALUES (?, ?, ?, ?, ?)', 
            [organization_id, req.body.organization_name, req.body.organization_address, req.body.organization_email, req.body.organization_phone_no]
        );
        
        const userResult = await connection.execute(
            'INSERT INTO user VALUES (?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ? , ?)', 
            [user_id, req.body.username, req.body.email, req.body.password, req.body.phone_no ,req.body.address, req.body.gender, req.body.dob, today, today, req.body.role, organization_id , 'Active']
        );

        await connection.commit();

        console.log('Organization and User inserted successfully');
        res.status(200).send({ data: "Organization and User inserted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        if(String(error).includes('Duplicate entry')){
            res.status(201).send({error:"Duplicate Entry"})
        }else{
            res.status(500).send({ error: 'Signup Failed'  , errorMsg:error });
        }
        
    } finally {
        if (connection) connection.release();
    }
});

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function generateUniqueOrganizationId() {
    let organization_id = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM organization WHERE orgid = ?', [organization_id]);
        if (rows.length === 0) {
            exists = false;
        } else {
            organization_id = generateUniqueId(); 
        }
    }
    return organization_id;
}

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
