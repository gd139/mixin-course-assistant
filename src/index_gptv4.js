//import module
const { BlazeClient } = require("mixin-node-sdk");
const { writeFile } = require("fs");
const request = require("request");
const {OpenAIApi} = require("openai")
const https = require('https');
const fs = require('fs');
//import constants
const config = require("./config.json");
const viplist = require("./viplist.json")

//new client
const client = new BlazeClient(config, { parse: true, syncAck: true });

//ws
client.loopBlaze({
  async onMessage(msg) {
   const user_id = msg.user_id
   const{vip1,vip2} = viplist
   if (user_id == vip1||user_id == vip2) {
    const { category, data } = msg;
    if (/^\//.test(data)) {
        sendImage(msg);
        //createImage(msg);
     } else {
        query(msg);
    };
    } else {
      await client.sendTextMsg(user_id, "你暂不在名单里，请再核查！") 
   }
},
  onAckReceipt(){
},
 
})

async function sendImage(msg) {
  let url = await createImageAI(msg)
  console.log(url)
  
  //let rueslt = sendImagetest(url,msg.user_id)
  let rueslt = await getImageFromUrl(url,msg.user_id)  
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
       client.uniqueConversationID(
         client.keystore.client_id,user_id),
      recipient_id:user_id,
      message_id:client.newUUID(),
      category: 'PLAIN_IMAGE',
      data: Buffer.from(JSON.stringify({
        attachment_id,
         height: 1920,
         mime_type: 'image/jpg',
         size: 162215,
         thumbnail: '',
         width: 1512    
      })).toString('base64')
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
