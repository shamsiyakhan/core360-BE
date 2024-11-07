const app = require('../express.js');
const pool = require('../db.js');
const sgMail = require('@sendgrid/mail');
const jwt=require('jsonwebtoken')

const secretkey='$12345core360'

const key=require('dotenv').config(); // Load environment variables from .env
const sendGridApiKey = process.env.SENDGRID_API_KEY;
    sgMail.setApiKey(sendGridApiKey);
 


app.post('/addManager' , async (req , res)=>{
    const userId=await generateUniqueUserId()
    const date = new Date()
    const connection =await pool.getConnection()
    try{
       await connection.beginTransaction();
        const response = await connection.execute('INSERT INTO user (userid, email,createdat , modifiedat , orgid, roleid , status) VALUES (?, ?, ?, ? , ? , ?, ?)',[userId, req.body.email, date , date , req.body.orgId, req.body.roleId , 'inActive']);
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

app.get('/getorgPeople/:orgid' , async (req , res)=>{



     const connection =await pool.getConnection();
        try{
        await connection.beginTransaction()
        const response=await connection.execute('select * from user where orgid=?' , [req.params.orgid])
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


app.get('/getTeams/:id', async (req, res) => {
    const orgid = req.params.id; // Extract orgid from route parameter

    if (!orgid) {
        return res.status(400).send({ error: "Organization ID is required" });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        console.warn("Beginning transaction");

        // Fetch the teams associated with the orgid
        const [teams] = await connection.execute('SELECT * FROM teams WHERE orgid = ?', [orgid]);
        console.warn("Teams fetched:", teams);

        if (teams.length === 0) {
            await connection.rollback();
            return res.status(401).send({ message: 'No teams found for this orgid' });
        }

        // Extract unique team member IDs
        const memberIds = new Set();
        teams.forEach(team => {
            console.warn("Team members before parsing:", team.teammember);
            const members = JSON.parse(team.teammember); // Parse the JSON string
            members.forEach(memberId => memberIds.add(memberId)); // Add each member ID to the set
        });

        console.warn("Unique member IDs:", Array.from(memberIds));

        // Convert Set to Array
        const memberIdArray = Array.from(memberIds);
        
        // Check if memberIdArray is empty before executing the SQL query
        if (memberIdArray.length === 0) {
            // No members found, return teams without user details
            return res.status(200).send({ data: teams });
        }

        // Prepare the SQL for multiple placeholders
        const placeholders = memberIdArray.map(() => '?').join(',');
        
        // Fetch user details for the collected member IDs
        const [users] = await connection.execute(`SELECT * FROM user WHERE userid IN (${placeholders})`, memberIdArray);
        console.warn("Users fetched:", users);

        // Create a map for quick user lookup
        const userMap = {};
        users.forEach(user => {
            // Using user ID as the key for unique entries
            userMap[user.userid] = user;
        });

        // Create a unique team object to avoid duplicates
        const uniqueTeams = {};

        // Combine the team and user data
        teams.forEach(team => {
            // Ensure teams are unique by teamid
            if (!uniqueTeams[team.teamid]) {
                uniqueTeams[team.teamid] = {
                    ...team,
                    users: [] // Initialize users array
                };

                const members = JSON.parse(team.teammember); // Parse team members

                // Add users to the unique team's users array
                members.forEach(memberId => {
                    const user = userMap[memberId];
                    if (user) {
                        uniqueTeams[team.teamid].users.push(user); // Add unique user
                    }
                });
            }
        });

        // Convert the uniqueTeams object back to an array
        const response = Object.values(uniqueTeams);
        console.warn(response)
        await connection.commit();
        res.status(200).send({ data: response });

    } catch (error) {
        console.error("Error during transaction:", error);
        await connection.rollback();
        res.status(500).send({ error: error.message });
    } finally {
        if (connection) await connection.release();
    }
});





app.post('/addTeams', async (req, res) => {
    const teamId = await generateUniqueTeamId(); // Ensure this function generates a unique ID
    const date = new Date();
    console.warn(req.body); // Logging the request body for debugging
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Convert the teammembers array to a comma-separated string or JSON string
        const teamMembersString = JSON.stringify(req.body.teammembers); // or use req.body.teammembers.join(',')

        const response = await connection.execute(
            `INSERT INTO teams (teamid, teamname, teaminfo, teammember, createdat, createdby, userid, orgid) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                teamId,                        // teamid
                req.body.teamname,            // teamname
                req.body.teaminfo,            // teaminfo
                teamMembersString,             // teammembers (converted to string)
                date,                          // createdat
                req.body.userid,              // createdby
                req.body.userid,              // userid
                req.body.orgid                // orgid
            ]
        );

        await connection.commit();
        res.status(200).send({ data: "Team Created" });
    } catch (error) {
        await connection.rollback();
        console.warn('Error during insert:', error);
        res.status(401).send({ error: error.message || 'Error inserting team' });
    } finally {
        if (connection) connection.release();
    }
});


app.delete('/Teams/:id', async (req, res) => {
    const teamid = req.params.id; // Extract orgid from route parameter

    if (!teamid) {
        return res.status(400).send({ error: "Organization ID is required" });
    }
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const response = await connection.execute(`delete from teams where teamid=?` , [teamid],);

        await connection.commit();
        res.status(200).send({ data: "Team Deleted Successfully" });
    } catch (error) {
        await connection.rollback();
        console.warn('Deletion Failed', error);
        res.status(401).send({ error: error.message || 'Error Deletimg team' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/update-registration' , async(req , res)=>{
    console.warn("update registration called")
    const date=new Date()
    const connection=await pool.getConnection()
    try{
        await connection.beginTransaction();
        connection.execute('update user set username=? , password=? , address=? , dob=? , modifiedat=? , status=? , phonenumber=? where userid=?' , [req.body.username , req.body.password , req.body.address , req.body.dob , date , 'active' , req.body.phone_no, req.body.userid])
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

async function generateUniqueTeamId() {
    let team_id = generateUniqueId();
    let exists = true;
    
    while (exists) {
        const [rows] = await pool.query('SELECT * FROM teams WHERE teamid = ?', [team_id]);
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