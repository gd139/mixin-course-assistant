
//
// Server Setup
//
const express = require('express');
const app = express();
const port = 4444;

app.get('/', (req, res) => res.send('Notes_Message_Query'));

app.listen(port, () => console.log(`N.M.Q.app listening on port ${port}!`));
//
// Database Setup
//
const { Sequelize, DataTypes, Model, STRING } = require('sequelize')
const sequelize = new Sequelize({
  // The `host` parameter is required for other databases
  // host: 'localhost'
  dialect: 'sqlite',
  storage: './db_message.sqlite'
});

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
// messages table
const Megsent = sequelize.define('megsents', { 
  id: {
    // 每一个字段的信息
    type: DataTypes.INTEGER(10), // 整数类型
    allowNull: false, // 不允许为空
    primaryKey: true, // 设置为主键
    autoIncrement: true // 允许自增
  },
  type: DataTypes.STRING,      
  representative_id: DataTypes.UUIDV4,
  quote_message_id: DataTypes.UUIDV4,
  conversation_id: DataTypes.UUIDV4,
  user_id: DataTypes.INTEGER,
  session_id: DataTypes.UUIDV4,
  message_id: DataTypes.UUIDV4,
  category: DataTypes.STRING,
  data: DataTypes.JSON,
  data_base64: DataTypes.STRING,
  status: DataTypes.STRING,
  source: DataTypes.STRING,
  silent: DataTypes.BOOLEAN,
  expire_in: DataTypes.INTEGER,
  });
// transfers table
const Transfer = sequelize.define('transfers',{
  id:{
    type: DataTypes.INTEGER(10), 
    allowNull: false, 
    primaryKey: true, 
    autoIncrement: true 
  },
  type: DataTypes.STRING,
  snapshot_id: DataTypes.UUIDV4,
  opponent_id: DataTypes.UUIDV4,
  asset_id: DataTypes.UUIDV4,
  amount: DataTypes.FLOAT,
  opening_balance:DataTypes.FLOAT,
  closing_balance:DataTypes.FLOAT,
  trace_id: DataTypes.UUIDV4,
  memo: DataTypes.INTEGER,
  created_at: DataTypes.DATE,
  transaction_hash:DataTypes.INTEGER,
  snapshot_hash:DataTypes.INTEGER,
  snapshot_at:DataTypes.DATE,
  counter_user_id: DataTypes.UUIDV4
})
// assets table
const Asset1 = sequelize.define('assets',{
  id:{
    type:DataTypes.INTEGER(10),
    allowNull: false, 
    primaryKey: true, 
    autoIncrement: true 
  },
  type: DataTypes.STRING,
  asset_id: DataTypes.UUIDV4,
  chain_id: DataTypes.UUIDV4,
  fee_asset_id: DataTypes.UUIDV4,
  symbol: DataTypes.STRING,
  name: DataTypes.STRING,
  icon_url: DataTypes.STRING,
  balance: DataTypes.FLOAT,
  deposit_entries: DataTypes.INTEGER,
  destination: DataTypes.INTEGER,
  tag: DataTypes.INTEGER,
  price_btc: DataTypes.FLOAT,
  price_usd: DataTypes.FLOAT,
  change_btc: DataTypes.FLOAT,
  change_usd: DataTypes.FLOAT,
  asset_key: DataTypes.UUIDV4,
  precision: DataTypes.INTEGER,
  mixin_id:DataTypes.INTEGER,
  reserve: DataTypes.INTEGER,
  confirmations: DataTypes.INTEGER,
  capitalization: DataTypes.FLOAT,
  liquidity: DataTypes.FLOAT
})
// raw table
const Raw = sequelize.define('raws',{
  id:{
    type: DataTypes.INTEGER(10), 
    allowNull: false, 
    primaryKey: true, 
    autoIncrement: true 
  },
  type: DataTypes.STRING,
  snapshot_id: DataTypes.UUIDV4,
  opponent_key: DataTypes.INTEGER,
  opponent_receivers: DataTypes.JSON,
  opponent_threshold: DataTypes.INTEGER,
  asset_id: DataTypes.UUIDV4,
  amount: DataTypes.FLOAT,
  opening_balance: DataTypes.FLOAT,
  closing_balance: DataTypes.FLOAT,
  trace_id: DataTypes.UUIDV4,
  memo: DataTypes.STRING,//'50rErpM8mXn9El5PGTDuBWZK4UiVzdaZBKLljQ1aV+NphHLl4b3/8Z4695GxNsRFMUO9+wsZZfswSMu1gLkhEIcs1/GLUx05r4v4gRLwIdBaHS8gipm5xTMRfQIdb7aw',
  state: DataTypes.STRING,
  created_at: DataTypes.DATE,
  transaction_hash: DataTypes.INTEGER,//'181d0713d1c0ccdfaed6fb9e9d16cc2f3cadfd56c6eb992c6a05b3ef7b5175dd',   
  snapshot_hash: DataTypes.INTEGER,
  snapshot_at: DataTypes.DATE,
})

 //async function MessageUpdate(msg_update) {
  sequelize.sync({ force: true })
   .then(async () => {
     console.log(`Database & tables created!`);})
  //Message.bulkCreate([message1,message2,msg_update
  // ]).then( ()=> {
  //      return Message.findAll();
  //    }).then(messages =>{
  //      console.log(messages);
  //    });
  //  });


//
// Routes
//
app.get('/', (req, res) => res.send('@@@ Notes_Message_Query up@@@@'));

app.get('/megsents', function(req, res) {
  Megsent.findAll().then(megsents => res.send(megsents));
});

app.get('/transfers', function(req, res) {
  Transfer.findAll().then(transfers => res.send(transfers));
});

app.get('/assets', function(req, res) {
  Asset1.findAll().then(assets => res.send(assets));
});

app.get('/raws', function(req, res) {
  Raw.findAll().then(raws => res.send(raws));
});
const Op = Sequelize.Op;

app.get('/megsents/search', function(req, res) {
  Megsent.findAll({
    limit: 2,
    where: {
      user_id:{
        [Op.or]: [].concat(req.query.user_id)
      },
      //message_id:{
      //  [Op.or]: [].concat(req.query.message_id)
      //}
    }
  }).then(megsents => {res.send(megsents)})
});

app.get('/transfers/:id', function(req, res) {
  //Note.findAll({ where: { id: req.params.id } }).then(notes => //res.json(notes));
  Transfer.findAll({ where: { id: req.params.id } }).then(transfers =>res.send(transfers))
})

app.get('/megsents/:id', function(req, res) {
  //Note.findAll({ where: { id: req.params.id } }).then(notes => //res.json(notes));
  Megsent.findAll({ where: { id: req.params.id } }).then(megsents =>
  res.send(megsents))
})

app.get('/assets/:id', function(req, res) {
  Asset1.findAll({ where: { id: req.params.id } }).then
(assets =>
  res.send(assets))
})

app.get('/raws/:id', function(req, res) {
  Raw.findAll({ where: { id: req.params.id } }).then
(raws =>
  res.send(raws))
})
//app.post('/messages', function(req, res) {
//  Note.create({ note: req.body.note, tag: req.body.tag }).en//(function(note) {
//    //res.json(note);
//    res.send(note)
//  });
//})
//app.put('/notes/:id', function(req, res) {
//  Note.findByPk(req.params.id).then(function(note) {
//    note.update({
//      note: req.body.note,
//      tag: req.body.tag
//    }).then((note) => {
//      //res.json(note);
//      res.send(note)
//    });
//  });
//});
//
//app.delete('/notes/:id', function(req, res) {
//  Note.findByPk(req.params.id).then(function(note) {
//    note.destroy();
//  }).then((note) => {
//    res.sendStatus(200);
//  });
//});
module.exports = {Megsent,Transfer,Asset1,Raw}
//module.exports = {Transfer}
// Transfer.drop();
// Megsent.drop()
// Asset1.drop()
// Raw.drop()