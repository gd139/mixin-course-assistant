//import module
const { BlazeClient,readNetworkAsset } = require("mixin-node-sdk");
const { writeFile } = require("fs");
const request = require("request");
const {OpenAIApi} = require("openai")
const https = require('https');
const fs = require('fs');
const { toBuffer } = require("qrcode");
const { validate: isUUID } = require('uuid')
//import constants
const config = require("./config.json");
const viplist = require("./viplist.json")
const msg_rpy = require("./test_msg_rpy.json");
const msg_rpy_path = "./test_msg_rpy.json";

//new client
const client = new BlazeClient(config, { parse: true, syncAck: true });

//ws
client.loopBlaze({
  async onMessage(msg) {
   console.log(msg) //打印发送消息
   msg_rpy[msg.message_id] =msg.data; //客户端将接收到的信息入json库
   const user_id = msg.user_id

   if(viplist.hasOwnProperty(user_id)){
    handleMsg(msg)  
    } else {
      await client.sendTextMsg(user_id, "你暂不在名单里，请再核查！") 
   }
},
  onAckReceipt(){
},
onTransfer(msg) {
  console.log(msg)
  handleReceivedDonate(msg)
}
})

//根据消息内容判断
async function handleMsg(msg) {
  const { category, data,user_id } = msg
  if (category !== 'PLAIN_TEXT')
  return client.sendTextMsg(user_id, "仅支持文本消息。")
  //if (/\?ds|？ds/)
  if (data === '?ds'||data ==='？ds') 
  return handleDonate(msg)
  if (data === '#code'||data ==='#CODE')
  //if (/^#(CODE|code)/) 
  return creatCode(msg)
  
  if (/^\//.test(data)) {
      sendImage(msg);
      //createImage(msg);
   } else {
      //query(msg);
     let result = await queryText(msg)
     //调用回调函数提取消息id，作为json对象字典的key，value = result
     client.sendMessageText(user_id, result).then(async (messageInfo) => {
      const message_id = messageInfo.message_id;
      msg_rpy[message_id] = result ; //构建对象字典    
      await updateJsonFile(msg_rpy,msg_rpy_path) //写入更新json文件
     })
    }
  }

async function sendImage(msg) {
  let url = await createImageAI(msg)
  console.log(url)
  let rueslt =sendImageHandle(url,msg.user_id)
  //let rueslt = sendImagetest(url,msg.user_id)
  //let rueslt = await getImageFromUrl(url,msg.user_id)  
    console.log(`result:${rueslt}`)  
}

// call OpenAI_API；Return Answer_TEXT
async function query({ user_id, data, category }) {
  const API_URL = "https://api.openai.com/v1/completions";
  const MODEL = "text-davinci-003";
  const options = {
    method: "POST",
    url: API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.API_KEY}`,
    },
    json: {
      prompt: data,
      max_tokens: 1024,
      temperature: 0.6,
      model: MODEL,
      user: user_id,
    },
  };
  
  request(options, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    const result = body.choices[0].text.replace(/^\s*[\r\n]/gm, '');
    client.sendMessageText(user_id, result);
    console.log
  } else {
    console.error(error);
  }
 })
} 

// call OpenAI_API；Return PNG_URL
async function createImageAI({ user_id,data }) { 
   const { Configuration, OpenAIApi } = require("openai");
   const configuration = new Configuration({
    //url:'https://api.openai.com/v1/images/generations',
    apiKey: `${config.API_KEY}`
    });

   const openai = new OpenAIApi(configuration);
       if (/^\/[Ii][Mm]/ ) {
         data = data.replace(/^\s{4}/, '');
         const response = await openai.createImage({
           prompt: data,
           n: 1,
           size: "512x512",
         });
        let image_url = response.data.data[0].url;
        //await client.sendTextMsg(user_id, image_url);    
        return  image_url   
      }
}
       
// from url load PNG, CALL sendImageMsg_api ，and filewrite and save PNG to path     
async function getImageFromUrl(url,user_id) {
  https.get(url, (res) => {
      let data = new Buffer.from([]);
      res.on('data', async (chunk) => {
          data = Buffer.concat([data, chunk]);
      });
      res.on('end', async () => {
        const { attachment_id } = await client.uploadFile(data) // 上传 buf
        await client.sendImageMsg(user_id, {
            attachment_id,
            mime_type: "image/jpeg",
            width: 512,
            height: 512,
            size: 272105,
            thumbnail:''//Buffer.from(data).toString('base64'), // 封面， buf 的base64
        }).then(console.log)
          //fs.writeFile('./openai_001.png', data, encoding="utf-8",(err) => {
          //    if (err) throw err;
          //});
          // let file_path = './001_test.jpg'
          // callback(file_path)
      });
  });
}

// call getImageFromUrlTes got attachment_id，then call sendMessage_api send IMAGE
//因为getImageFromUrlTest(url,user_id)函数中使用了异步操作，返回的是一个Promise，而不是attachment_id,需要再封装函数进行await 后得到id

async function sendImagetest(url,user_id) {
  const attachment_id = await getImageFromUrlTest(url,user_id);
  console.log(`id:${attachment_id}`)

  client.sendMessage({
     conversation_id:
     //'cf1ce443-9da6-3aba-acb5-48d11526fb65',//可以使用指定，两//者间唯一，也可/
       client.uniqueConversationID(
         client.keystore.client_id,
         user_id//'9dcd64cf-d753-4c53-87d0-bc011fd94cb3'
         ),
      recipient_id:
       user_id,//'9dcd64cf-d753-4c53-87d0-bc011fd94cb3',
      message_id:client.newUUID(),
      category: 'PLAIN_IMAGE',
      data: Buffer.from(JSON.stringify({
        attachment_id,//'c6bb5e30-5ec7-4da1-944d-e67bcc90e915',
         height: 1920,
         mime_type: 'image/jpg',
         size: 162215,
         thumbnail: '',
         width: 1512    
      })).toString('base64')
  }).then(console.log)
}

// call getImageFromUrlTest got attachment_id,call sendImage_api 
async function sendImageHandle(url,user_id) {
  const attachment_id = await getImageFromUrlTest(url,user_id);
  console.log(`id:${attachment_id}`)
  await client.sendImageMsg(user_id, {
    attachment_id,
    mime_type: "image/jpeg",
    width: 512,
    height: 512,
    size: 272105,
    thumbnail:''//Buffer.from(data).toStrin
  }).then(console.log)
}


//from url get attachment_id
async function getImageFromUrlTest(url,user_id) {
  return new Promise((resolve, reject) => {
    https.get(url, (res)=> {
        let data = new Buffer.from([]);
        res.on('data',  (chunk) => {
            data = Buffer.concat([data, chunk]);
        });
        res.on('end', async () => {
            const {attachment_id}  = await client.uploadFile(data)
            resolve(attachment_id);
        });
    });
  });
}

async function queryText({user_id, data, quote_message_id})  {
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
   apiKey: `${config.API_KEY}`});
   let id = quote_message_id
   let text = msg_rpy[id]
  const openai = new OpenAIApi(configuration);
  if (id = '') { data = data} else{ data = `${data}:${text}`} //判断是否为回复引用信息
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: data,
    max_tokens: 1024,
    temperature: 0.6,
    user: user_id
  })
  const result = response.data['choices'][0]['text'].replace(/^\s*[\r\n]/gm, '');
  //client.sendMessageText(user_id, result);
  return result
}

// 将对象写入JSON文件
async function updateJsonFile(file,file_path){
   writeFile(file_path, JSON.stringify(file, null, 2), (error) => {
  if (error) {
    console.log("An error has occurred ", error);
    return;
  }
  console.log(
    "updateRep(file): test_msg_rpy.json updated successfully "
  );
});}

// - 用户给机器人发送 `？打赏$0.01`
// - 机器人收到消息后，给用户发送自己的转账按钮
// - 若用户成功转账，则向用户回复 “打赏的 {amount}{symbol} 已收到，感谢您的支持。
async function handleDonate({user_id}) {
  const uuid = client.newUUID();
  console.log('uuid:',uuid);
  //const payer = msg.data.memo.substring(37);
  const transferAction = `https://mixpay.me/gpttest/001?settlementMemo=${user_id}&traceId=${uuid}`
  //const transferAction ="https://mixpay.me/code/e4c7e700-4ed4-4c13-9b9e-070c64cae8e1"
  //const transferAction = `mixin://transfer/${client.keystore.client_id}`
  //const transferAction = `https://mixpay.me/pay?payeeId=${config.client_id}&settlementAssetId=${config.usdt_asset_id}&quoteAssetId=${config.usdt_asset_id}&Amount="0.0123"&settlementMemo=${user_id}&traceId=${uuid}`
  
  await client.sendAppButtonMsg(user_id, [
    {
      label: `打赏$0.01`,
      action: transferAction,
      //color: "#F0F8FF"
      //color: "#F0F8FF"
      color: "#FF0000"
    }
  ])
  return true
}

async function handleReceivedDonate({ user_id,data }) {
  const payerid = data.memo.substring(0, 36)
  const username = (await client.readUser(payerid)).full_name;
  const { asset_id, amount } = data
  if (Number(amount) <= 0) return
  const { symbol } = await readNetworkAsset(asset_id)
  await client.sendTextMsg(payerid, `${username}转来的 ${amount} ${symbol} 已收到，感谢您的支持。`)
  //await client.readSnapshots(data.readsnapshot_id).then(console.log)
  await client.readTransfer(data.trace_id).then(console.log)
}

//coding
async function creatCode(file){
 const { Configuration, OpenAIApi } = require("openai");
 const configurations = new Configuration({
   apiKey: `${config.API_KEY}`,
 });
 const openai = new OpenAIApi(configurations);
 
 const response = await openai.createCompletion({
   model: "code-davinci-002",
   prompt: file,
   temperature: 0.61,
   max_tokens: 250,
   top_p: 1,
   frequency_penalty: 0,
   presence_penalty: 0,
   stop: ["#", ";"],
 });
 let result = response.data.choices[0].text
 console.log(result)
 return 
 }
