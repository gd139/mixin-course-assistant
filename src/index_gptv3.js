//import module
const { BlazeClient } = require("mixin-node-sdk");
const { writeFile } = require("fs");
const request = require("request");
const {OpenAIApi} = require("openai")
//import constants
const config = require("./config.json");
const viplist = require("./viplist.json")

//new client
const client = new BlazeClient(config, { parse: true, syncAck: true });

//ws
client.loopBlaze({
  async onMessage(msg) {
    //const vip1 = `${viplist.vip1}`
    //const vip2 = `${viplist.vip2}`
   const user_id = msg.user_id
   const{vip1,vip2} = viplist
   if (user_id == vip1||user_id == vip2) {
    const { category, data } = msg;
    if (/^\//.test(data)) {
        createImage(msg);
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
  } else {
    console.error(error);
  }
 })
} 

async function createImage({ user_id, data }) { 
   const { Configuration, OpenAIApi } = require("openai");
   const configuration = new Configuration({
    apiKey: `${config.API_KEY}`,
   });
   const openai = new OpenAIApi(configuration);
      if (/^\/[Ii][Mm]/ ){
        data = data.replace(/^\s{4}/, '');
        const response = await openai.createImage({
          prompt: data,
          n: 1,
          size: "512x512",
        });
        image_url = response.data.data[0].url;
        await client.sendTextMsg(user_id, image_url);        
      }
}
