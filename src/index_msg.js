// mixin-bot opAI Setup
const {Configuration,OpenAIApi} = require('openai');
const { BlazeClient,readNetworkAsset } = require("mixin-node-sdk");
const config = require("./config-test.json");
const configuration = new Configuration({apiKey: `${config.API_KEY}`});
const openai = new OpenAIApi(configuration);
const client = new BlazeClient(config, { parse: true, syncAck: true });

client.loopBlaze({
  async onMessage(msg) {
   //console.log(msg); //打印bot收到的消
   MessageUpdate(msg);
   handleMsg(msg);  
   //Messageseach(msg) 
},
  onAckReceipt(){
},
onTransfer(msg) {
  console.log(msg)
//  handleReceivedDonate(msg)
}
})

//model update
async function handleMsg(msg){
let id = msg.quote_message_id
let result = await Messageseach(id)
if (id = '') { 
data = msg.data
} else{ 
//let result = await Messageseach(id)
//console.log(result)
data = `${msg.data}:${result}`
console.log('引用合并效果:',data)}

let result1 = await queryText(data)
//console.log ('GPT:',result1)
client.sendMessageText(msg.user_id,result1).then(async (messageInfo) =>{
 Object.assign(messageInfo, {data:`${result1}`})
 await MessageUpdate(messageInfo)
})
}

//GPT query 
async function queryText(data) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: data,
    max_tokens: 1024,
    temperature: 0.6,
    //user: user_id
  })
  const result = response.data['choices'][0]['text'].replace(/^\s*[\r\n]/gm, 
'');
  //client.sendMessageText(user_id, result);
  return result
}
//
// Server Setup
//
const express = require('express');
const app = express();
const port = 3002;

app.get('/', (req, res) => res.send('Notes_MSG App'));

app.listen(port, () => console.log(`notes_ MSG-app listening on port ${port}!`));
//
// Database Setup
//
const { Sequelize, DataTypes, Model } = require('sequelize')
const sequelize = new Sequelize({
  // The `host` parameter is required for other databases
  // host: 'localhost'
  dialect: 'sqlite',
  storage: './database.sqlite'
});

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
const Message = sequelize.define('messages', { 
  id: {
    // 每一个字段的信息
    type: DataTypes.INTEGER(10), // 整数类型
    allowNull: false, // 不允许为空
    primaryKey: true, // 设置为主键
    autoIncrement: true // 允许自增
  },
  type: DataTypes.STRING,      
  representative_id: DataTypes.INTEGER(36),
  quote_message_id: DataTypes.INTEGER(36),
  conversation_id: DataTypes.INTEGER(36),
  user_id: DataTypes.INTEGER,
  session_id: DataTypes.INTEGER(36),
  message_id: DataTypes.INTEGER(36),
  category: DataTypes.STRING,
  data: DataTypes.TEXT,
  data_base64: DataTypes.STRING,
  status: DataTypes.STRING,
  source: DataTypes.STRING,
  silent: DataTypes.BOOLEAN,
  expire_in: DataTypes.INTEGER,
  });

 //async function MessageUpdate(msg_update) {
  sequelize.sync({ force: false })
   .then(async () => {
     console.log(`Database & tables created!`);})
  //Message.bulkCreate([message1,message2,msg_update
  // ]).then( ()=> {
  //      return Message.findAll();
  //    }).then(messages =>{
  //      console.log(messages);
  //    });
  //  });

  //更新消息函数到数据库
async function MessageUpdate(msg_update) {
    let msg_up = await Message.create(msg_update)
    console.log(`apdate.id:${msg_up.id}\ncontent:${msg_up.data}`)
}

//
async function Messageseach(quote_message_id){
  let id = quote_message_id
  if(id !=""){
  const msg_find = await Message.findOne({ where: {message_id:id } });
  if (msg_find === null) {
  console.log('Not found!');
  } else {
    console.log(`quote_id:${msg_find.id}\nquote_data:${msg_find.data}`); 
    return msg_find.data
};}
}

//
// Routes
//
app.get('/', (req, res) => res.send('Notes MSG App'));

app.get('/messages', function(req, res) {
  //Note.findAll().then(notes => res.json(notes));
  Message.findAll().then(messages => res.send(messages));
});

//app.get('/notes/search', function(req, res) {
//  Note.findAll({ where: { note: req.query.note, tag: reqery.////g } }).then(notes => res.json(notes))   
//        .then(notes => res.send(notes));
//});
//
 const Op = Sequelize.Op;

app.get('/messages/search', function(req, res) {
  Message.findAll({
    limit: 2,
    where: {
      user_id:{
        [Op.or]: [].concat(req.query.user_id)
      },
      //message_id:{
      //  [Op.or]: [].concat(req.query.message_id)
      //}
    }
  }).then(messages => {res.send(messages)})
});
app.get('/messages/:id', function(req, res) {
  //Note.findAll({ where: { id: req.params.id } }).then(notes => //res.json(notes));
  Message.findAll({ where: { id: req.params.id } }).then(messages =>
  res.send(messages))
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