const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const mongourl = 'mongodb+srv://yiuming628:Tom1@cluster0.9ushbsy.mongodb.net/?retryWrites=true&w=majority';
const dbName = '381project';
const bodyParser = require('body-parser');
app.use(formidable());
app.set('view engine', 'ejs');
const SECRETKEY = '10001';
const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: [SECRETKEY],
}));

var userslist = new Array(
  {uid:"10001",name: "Peter Parker", password: "10001"},
  {uid:"20002",name: "Ken", password: "20002"},
  {uid:"30003",name: "Thomas", password: "30003"}
);

const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('inventory').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const handle_Find = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('list',{ninventory: docs.length, inventory: docs});
        });
    });
}

const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {inventory: docs[0]});
        });
    });
}

const handle_Edit = (res, query) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        // Use the itemID from the query parameters to find the item in the database
        findDocument(db, { itemID: query.itemID }, (docs) => {
            client.close();
            console.log("Closed DB connection");

            // Check if an item was found
            if (docs.length > 0) {
                // Render the edit view with the item data
                res.render('edit', { item: docs[0] });
            } else {
                // Send a 404 Not Found response if no item was found
                res.status(404).send('Item not found');
            }
        });
    });
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('inventory').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {
        var DOCID = {};
        DOCID['_id'] = ObjectID(req.fields._id);
        var updateDoc = {};
         updateDoc['itemID'] = req.fields.itemID;
        updateDoc['itemName'] = req.fields.itemName;
        updateDoc['supplier'] = req.fields.supplier;
        updateDoc['itemQuantity'] = req.fields.itemQuantity;
        if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                updateDocument(DOCID, updateDoc, (results) => {
                    res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})
                });
            });
        } else {
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})
            });
        }
  
}
const handle_Delete = function(res, criteria) {
  const client = new MongoClient(mongourl);
  client.connect(function(err) {
      console.log("Connected successfully to server");
      const db = client.db(dbName);

let deldocument = {};

      deldocument["_id"] = ObjectID(criteria._id);
      deldocument["itemID"] = criteria.owner;
      console.log(deldocument["_id"]);
      console.log(deldocument["itemID"]);
      
      deleteDocument(db, deldocument, function(results){
          client.close();
          console.log("Closed DB connection");
          res.status(200).render('info', {message: "Document is successfully deleted."});
      })     
  });

}
app.use((req,res,next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);  
    next();
})


app.get('/', (req, res) => {
    res.render('login');
  });
  app.get('/login', (req,res) => {
    res.status(200).render('login',{});
  });
  
  app.post('/login', (req, res) => {
    for (var i = 0; i < userslist.length; i++) {
      if (
        userslist[i].uid == req.body.uid &&
        userslist[i].password == req.body.password
      ) {
        req.session.name = userslist[i].name;
      console.log(req.session.name);
      return res.status(200).redirect('/main');
    }
  }
});
  app.get('/main', (req, res) => {
    
    const username = req.session.name;
  
    res.render('main', { username });
  });

app.get('/find', (req,res) => {
    handle_Find(res, req.query.docs);
})

app.get('/details', (req,res) => {
    handle_Details(res, req.query);
})

app.get('/edit', (req,res) => {
    handle_Edit(res, req.query);
})

app.post('/update', (req,res) => {
    handle_Update(req, res, req.query);
})
app.get('/delete', function(req, res){
  if(req.query.itemID == req.session.itemID){
      console.log("...Hello !");
      handle_Delete(res, req.query);
  }else{
      return res.status(200).render('find', {message: "Access denied - You don't have the access and deletion right!"}); 
  }
});

app.post('/api/item/:itemID', (req,res) => {
    if (req.params.itemID) {
        console.log(req.body)
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null,err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            let newDoc = {};
             newDoc['itemID'] = req.fields.itemID;
            newDoc['itemName'] = req.fields.itemName;
            newDoc['supplier'] = req.fields.supplier;
            newDoc['itemQuantity'] = req.fields.itemQuantity;
            if (req.files.filetoupload && req.files.filetoupload.size > 0) {
                fs.readFile(req.files.filetoupload.path, (err,data) => {
                    assert.equal(err,null);
                    newDoc['photo'] = new Buffer.from(data).toString('base64');
                    db.collection('bookings').insertOne(newDoc,(err,results) => {
                        assert.equal(err,null);
                        client.close()
                        res.status(200).json({"Successfully inserted":newDoc}).end();
 
                    })
                });
            } else {
                db.collection('inventory').insertOne(newDoc,(err,results) => {
                    assert.equal(err,null);
                    client.close()
                    res.status(200).json({"Successfully inserted":newDoc}).end();
                })
            }
        })
    } else {
        res.status(500).json({"error": "missing bookingid"});
    }
})

app.get('/api/item/:itemID', (req,res) => {
    if (req.params.itemID) {
        let criteria = {};
        criteria['itemID'] = req.params.itemID;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing bookingid"}).end();
    }
})

app.put('/api/item/:itemID', (req,res) => {
    if (req.params.itemID) {
        console.log(req.body)
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null,err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            let criteria = {}
            criteria['itemID'] = req.params.itemID

            let updateDoc = {};
            Object.keys(req.fields).forEach((key) => {
                updateDoc[key] = req.fields[key];
            })
            console.log(updateDoc)
            if (req.files.filetoupload && req.files.filetoupload.size > 0) {
                fs.readFile(req.files.filetoupload.path, (err,data) => {
                    assert.equal(err,null);
                    newDoc['photo'] = new Buffer.from(data).toString('base64');
                    db.collection('inventory').updateOne(criteria, {$set: updateDoc},(err,results) => {
                        assert.equal(err,null);
                        client.close()
                        res.status(200).json(results).end();
                    })
                });
            } else {
                db.collection('inventory').updateOne(criteria, {$set: updateDoc},(err,results) => {
                    assert.equal(err,null);
                    client.close()
                    res.status(200).json(results).end();
                })
            }
        })
    } else {
        res.status(500).json({"error": "missing bookingid"});
    }
})

/*  DELETE
curl -X DELETE localhost:8099/api/booking/BK999
*/
app.delete('/api/item/itemID', (req,res) => {
    if (req.params.itemID) {
        let criteria = {};
        criteria['itemID'] = req.params.itemID;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            db.collection('inventory').deleteMany(criteria,(err,results) => {
                assert.equal(err,null)
                client.close()
                res.status(200).json(results).end();
            })
        });
    } else {
        res.status(500).json({"error": "missing bookingid"});       
    }
})


app.get('/*', (req,res) => {
    //res.status(404).send(`${req.path} - Unknown request!`);
    res.status(404).render('info', {message: `${req.path} - Unknown request!` });
})

app.listen(app.listen(process.env.PORT || 8099));
