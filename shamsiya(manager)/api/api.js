//import express section
const pool = require('../../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app = require('../../express.js')
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');
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
    const organizationId = req.params.id


    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const response = await connection.execute("select * from inventory where orgid=?", [organizationId]);
        await connection.commit();
        res.status(200).send({ data: response[0] })
    }
    catch {
        await connection.rollback()
        res.status(401).send({ error: 'Faild To Get Values' })

    }
    finally {
        if (connection) await connection.release()

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

app.get('/getUserDetails', async (req, res) => {
    console.warn("get user details called")
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const token = req.headers.authorization?.split(' ')[1];
        console.warn(token)
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        console.warn("decoding")

        // Verify the token and decode it
        const decoded = jwt.verify(token, '12345@core360');
        console.warn(decoded)
        const userId = decoded.userid;

        console.warn("trying to get data")
        const response = await connection.execute('SELECT * FROM user WHERE userid = ?', [userId]);
        if (response.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with user data
        res.status(200).json({ data: response[0] });
        await connection.commit();
    } catch (error) {
        res.status(500).json({ message: 'Failed to authenticate token', error });
        await connection.rollback();
    } finally {
        if (connection) connection.release()
    }
})

app.post("/update-user", async (req, res) => {
    const connection = await pool.getConnection()
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.warn(token)
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        console.warn("decoding")

        // Verify the token and decode it
        const decoded = jwt.verify(token, '12345@core360');
        console.warn(decoded)
        const userId = decoded.userid;
        const date = new Date()
        await connection.beginTransaction()
        const response = await connection.execute('update user set username=? , password=? ,phonenumber=? ,address=? , gender=? , dob=? , modifiedat=? where userid=?', [req.body.username, req.body.password, req.body.phonenumber, req.body.address, req.body.gender, req.body.dob, date, userId])
        res.status(200).send({ data: "User Data Updated SuccessFully" })
        await connection.commit()
    } catch (error) {
        await connection.rollback()
        res.status(401).send({ error: error })
    } finally {
        if (connection) await connection.release
    }
})

app.post("/update-user-owner", async (req, res) => {
    const connection = await pool.getConnection()
    try {
        const date = new Date()
        await connection.beginTransaction()
        const response = await connection.execute('update user set username=? , password=? ,phonenumber=? ,address=? , gender=? , dob=? , modifiedat=? where userid=?', [req.body.username, req.body.password, req.body.phonenumber, req.body.address, req.body.gender, req.body.dob, date, req.body.userid])
        res.status(200).send({ data: "User Data Updated SuccessFully" })
        await connection.commit()
    } catch (error) {
        await connection.rollback()
        res.status(401).send({ error: error })
    } finally {
        if (connection) await connection.release
    }
})

app.delete('/user/:userid', async (req, res) => {
    const userid = req.params.userid
    const connection = await pool.getConnection()
    try {
        const date = new Date()
        await connection.beginTransaction()
        const response = await connection.execute('delete from user where userid=?', [userid])
        res.status(200).send({ data: "User Deleted SuccessFully" })
        await connection.commit()
    } catch (error) {
        await connection.rollback()
        res.status(401).send({ error: error })
    } finally {
        if (connection) await connection.release
    }
})

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


async function generateUniqueRequestId() {
    let rid = generateUniqueId();
    let exists = true;

    while (exists) {
        const [rows] = await pool.query('SELECT * FROM taskrequest WHERE rid = ?', [rid]);
        if (rows.length === 0) {
            exists = false;
        } else {
            rid = generateUniqueId();
        }
    }
    return rid;
}

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

app.get('/gettasks/:id', async (req, res) => {
    const id = req.params.id;
    const connection = await pool.getConnection();
    try {
        console.log("before ")
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
                t.assignedby = ?;`,
            [id]
        );
        console.log("after ")
        console.warn('Raw Response:', response);  // Debugging: Check raw response

        // Restructure the response
        const response1 = response.map(row => ({
            taskId: row.taskid,
            taskName: row.taskname,
            taskStatus: row.taskstatus,
            deadline: row.deadline,
            assignedat: row.assignedat,
            hourstracked: row.hourstracked,
            starttime: row.starttime,
            endtime: row.endtime,
            progressStatus: row.inprogress,
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
/* employee task assign */


app.post('/raiserequest/:id', async (req, res) => {
    const taskid = req.params.id;
    const { msg, deadline } = req.body;
    const reqid = await generateUniqueRequestId()
    const connection = await pool.getConnection();

    try {
        // Start the transaction
        await connection.beginTransaction();

        // Fetch task details
        const [taskRows] = await connection.execute("SELECT * FROM task WHERE taskid = ?", [taskid]);
        if (taskRows.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Extract the required fields from the task
        const task = taskRows[0];
        const assignedby = task.assignedby;
        const assignedto = task.userid;
        const date = new Date()

        // Insert into the taskrequest table
        const query = `
        INSERT INTO taskrequest (rid ,assignedby, assignedto, rmsg, deadline, status, taskid , request_addedAt)
        VALUES (?,?, ?, ?, ?, 'pending', ? , ?)
      `;
        await connection.execute(query, [reqid, assignedby, assignedto, msg, deadline, taskid, date]);

        // Commit the transaction
        await connection.commit();

        res.status(201).json({ data: "Request raised successfully" });
    } catch (error) {
        // Rollback the transaction in case of an error
        console.error(error)
        await connection.rollback();
        res.status(500).json({ error: "An error occurred", details: error.message });
        console.error(error.message)
    } finally {
        // Release the connection
        connection.release();
    }
});



app.get('/getMyRequest/:id', async (req, res) => {
    const userid = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Query to fetch task request and associated user details for 'assignedto'
        const [response] = await connection.execute(`
            SELECT 
                tr.*, 
                u.userid AS assignedto_userid, 
                u.username AS assignedto_name, 
                u.email AS assignedto_email, 
                u.phonenumber AS assignedto_phonenumber 
            FROM 
                taskrequest tr
            INNER JOIN 
                user u ON tr.assignedto = u.userid
            WHERE 
                tr.assignedby = ? AND tr.status = ?`, 
            [userid, 'pending']
        );

        // Formatting response for API
        const formattedResponse = response.map(row => ({
            requestId: row.rid,
            assignedBy: row.assignedby,
            assignedTo: {
                userId: row.assignedto_userid,
                name: row.assignedto_name,
                email: row.assignedto_email,
                phoneNumber: row.assignedto_phonenumber
            },
            message: row.rmsg,
            deadline: row.deadline,
            status: row.status,
            taskId: row.taskid,
            requestAddedAt: row.request_addedAt,
            actionAddedAt: row.request_action_addedAt
        }));

        res.status(200).send({ data: formattedResponse });
        await connection.commit();
    } catch (errorobj) {
        await connection.rollback();
        console.warn(errorobj);
        res.status(401).send({ error: errorobj.message });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
});






app.post('/approveRequest/:id', async (req, res) => {
    const rid = req.params.id
    const connection = await pool.getConnection()
    const date = new Date()
    try {
        await connection.beginTransaction()
        const response = await connection.execute(
            'UPDATE taskrequest SET status = ?, deadline = ?, request_action_addedAt = ? WHERE rid = ?',
            ['approved', req.body.deadline, date, rid]
        );
        const response1 = connection.execute('update task set deadline=? where taskid=?', [ req.body.deadline, req.body.taskid])
        res.status(200).send({ data: "Request Approved" })
        await connection.commit()
    }
    catch (errorobj) {
        await connection.rollback()
        res.status(401).send({ error: "Request Denied" })
    }
    finally {
        if (connection) {
            await connection.release()
        }
    }
})



app.post('/declineRequest/:id', async (req, res) => {
    const rid = req.params.id
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const response =await connection.execute('update taskrequest set status=?  where rid=?', ['declined', rid])
        res.status(200).send({ data: "Request Declined" })
        await connection.commit()
    }
    catch (errorobj) {
        await connection.rollback()
        res.status(401).send({ error: "Error declining" })
    }
    finally {
        if (connection) {
            await connection.release()
        }
    }
})

app.get('/requestStatus/:id', async (req, res) => {
    const rid = req.params.id;
    console.warn(rid);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
 
        // Query to get details from taskrequest and task tables
        const [response] = await connection.execute(
            `SELECT 
                tr.*,
                t.taskname,
                t.taskstatus,
                t.deadline AS task_deadline,
                t.assignedat AS task_assignedat,
                t.hourstracked,
                t.starttime,
                t.endtime,
                t.inprogress
             FROM 
                taskrequest tr
             LEFT JOIN 
                task t ON tr.taskid = t.taskid
             WHERE 
                tr.assignedto = ?`,
            [rid]
        );

        // Send response with data
        res.status(200).send({ data: response });
        await connection.commit();
    } catch (errorobj) {
        await connection.rollback();
        console.error(errorobj);
        res.status(401).send({ error: errorobj.message });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
});

