const express = require('express');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 9000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.845tn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

function varifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const database = client.db('assignment-Collection');
        const users = database.collection('All-Users');
        const billing = database.collection('All-billing');

        // post and get users
        app.post('/api/registration', async (req, res) => {
            const user = req.body;
            const result = await users.insertOne(user);
            res.json(result);
        });

        app.post('/api/login', async (req, res) => {
            const user = req.body;
            const data = users.find({
                $or: [
                    { Email: `${user.Email}` },
                    { Password: `${user.Email}` },
                ],
            });
            const value = await data.toArray();

            const accessToken = jwt.sign(
                value[0],
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1d' }
            );
            console.log(accessToken);
            res.send({ accessToken });
        });

        // post and get users
        app.post('/api/add-billing', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const user = req.body;
                const result = await billing.insertOne(user);
                res.json(result);
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.post('/api/billing-list', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const page = req.body;
                const regex = new RegExp(page.search)
                console.log(regex)
                const data = users.find(
                    // { name: { FullName: `${page.search}`, Eamil: `${page.search}`, Phone: `${page.search}` } }
                    { FullName: regex }
                );
                const value = await data.toArray();
                console.log(value);

                res.json(value);
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });
        app.get('/api/billing-list', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const page = req.query.page;
                console.log(page);

                const cursor2 = billing.find({});
                const total = await cursor2.sort({ _id: -1 }).toArray();
                const data = total?.map((da) => da.PaidAmount);
                const value = data?.reduce(
                    (pre, post) => parseInt(pre) + parseInt(post),
                    0
                );

                const cursor3 = billing.find({});
                let result;
                if (page > 0) {
                    result = await cursor3
                        .sort({ _id: -1 })
                        .skip((page - 1) * 10)
                        .limit(10)
                        .toArray();
                } else {
                    result = await cursor3
                        .sort({ _id: -1 })
                        .limit(10)
                        .toArray();
                }

                res.send({
                    pages: total.length,
                    total: value,
                    result,
                });
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.get('/api/update-billing/:id', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await billing.findOne(query);
                res.json(result);
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.put('/api/update-billing/:id', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const id = req.params.id;
                const data = req.body;
                const query = { _id: ObjectId(id) };
                const updateDoc = { $set: data };
                const options = { upsert: true };
                const result = await billing.updateOne(
                    query,
                    updateDoc,
                    options
                );
                res.json(result);
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.delete('/api/delete-billing/:id', varifyJwt, async (req, res) => {
            const decodedEmail = req?.decoded?.Email;
            if (decodedEmail) {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await billing.deleteOne(query);
                res.json(result);
            } else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });
    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('This is Programming hero assesment task');
});

app.listen(port, () => {
    console.log(`localhost started ${port}`);
});
