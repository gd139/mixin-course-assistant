//import module
const { BlazeClient,readNetworkAsset,searchNetworkAsset } = require("mixin-node-sdk");
const https = require('https');
const fs = require('fs');
const {Configuration,OpenAIApi} = require('openai');
const {Megsent,Transfer} =require('./message')

//import constants
const config = require("../src/config-test.json");
const viplist = require("../src/viplist-test2.json");
const configuration = new Configuration(
    {apiKey: `${config.API_KEY}`});
const openai = new OpenAIApi(configuration);
//new client
const client = new BlazeClient(config, { parse: true, syncAck: true });


//ws
client.loopBlaze({
  async onMessage(msg) {
    //msgManager(msg);
  if (msg.category !== 'PLAIN_TEXT') 
  return client.sendTextMsg(msg.user_id, "仅支持文本消息。")
   let msg_up = await Megsent.create(msg)
   console.log(`apdate.id:${msg_up.id}\ncontent:${msg_up.data}`)
   //MsgSeach(msg.quote_message_id)

  if(viplist.hasOwnProperty(msg.user_id)){
    //readAssetPr(msg)
    handleMsg(msg)  
   } else {
     await client.sendTextMsg(msg.user_id, "你暂不在名单里，请再核查") 
  }
},
  onAckReceipt(){
},
  async onTransfer(msg) {
  console.log('TRANSFER:',msg)
let msg_trf_up = await Megsent.create(msg);
console.log(`trf_apdate.id:${msg_trf_up.id}\ntrf_content:${msg_trf_up.data.amount}`)
  handleReceivedDonate(msg)
}
})

async function msgManager({user_id,source,category,
}) {
    if (source === "LIST_PENDING_MESSAGES") {
      return 
    } else if (category !== "PLAIN_TEXT") {
      client.sendMessageText(user_id, "仅支持文本消息");
      return
    }
  }
//根据消息内容判断
async function handleMsg(msg) {
  //if (msg.category !== 'PLAIN_TEXT')
  //return client.sendTextMsg(msg.user_id, "仅支持文本消息。")
  if (msg.data === '?ds'||msg.data ==='？ds') 
  return handleDonate(msg);
  //if (msg.data === '?pr'||msg.data ==='？pr') 
  //return readAssetPr(msg); 
  if (/^\//.test(msg.data)) {
      sendImage(msg);
      //createImage(msg);
   } else {
    if(/^\?/.test(msg.data)){
    let file = msg.data.replace(/^\?[pP][rR]\s{1}/, '');
    console.log(file)
    let Asset = await readAssetPr(msg.user_id,file)
    //client.sendMessageText(msg.user_id, `${Asset[0]}的价格是：$${Asset[1]}`)
    } else {
        let id = msg.quote_message_id
        let result = await MsgSeach(id)
        if (id = '') { 
        data = msg.data
        } else{ 
        //let result = await Messageseach(id)
        //console.log(result)
        data = `${msg.data}:${result}`
        console.log('引用合并结果:',data)
        } 
        let result1 = await queryText(data)
        console.log ('GPT:',result1)
        client.sendMessageText(msg.user_id,result1).then(async (messageInfo)=>{
         Object.assign(messageInfo, {data:`${result1}`})
         let msg_up2 = await Megsent.create(messageInfo)
         console.log(`apdate2.id:${msg_up2.id}\ncontent2:${msg_up2.data}`)
        })
        }
    }
  }

//Got AI_png url,tranfer to web,get png send to client
async function sendImage(msg) {
  let url = await createImageAI(msg)
  console.log('AI IMAGE:',url)
  await client.sendTextMsg(msg.user_id, "图片正在处理，请稍等...")
  let rueslt =sendImageHandle(url,msg.user_id) 
}

// call OpenAI_API；Return PNG_URL
async function createImageAI({ user_id,data }) { 
   //const openai = new OpenAIApi(configuration);
       if (/^\/[Ii][Mm]/ ) {
         data = data.replace(/^\[Ii][Mm]\s{1}/, '');
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

// call getImageFromUrlTest, return attachment_id;call sendImage_api 
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

async function queryText(data)  {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: data,
    max_tokens: 1024,
    temperature: 0.6,
    //user_id
  })
  const result = response.data['choices'][0]['text'].replace(/^\s*[\r\n]/gm, '');
  //client.sendMessageText(user_id, result);
  return result
}

// - 用户给机器人发送 `？打赏$0.01`
// - 机器人收到消息后，给用户发送自己的转账按钮
// - 若用户成功转账，则向用户回复。
async function handleDonate({user_id}) {
  const uuid = client.newUUID();
  console.log('uuid:',uuid);
  //const payer = msg.data.memo.substring(37);
  const transferAction = `https://mixpay.me/gpttest/001?settlementMemo=${user_id}&traceId=${uuid}`
  //const transferAction = `mixin://transfer/${client.keystore.client_id}`
  //const transferAction = `https://mixpay.me/pay?payeeId=${config.client_id}&settlementAssetId=${config.usdt_asset_id}&quoteAssetId=${config.usdt_asset_id}&Amount="0.0123"&settlementMemo=${user_id}&traceId=${uuid}`
  
  await client.sendAppButtonMsg(user_id, [
    {
      label: `打赏$0.01`,
      action: transferAction,
      color: "#FF0000"
    }
  ])
  return true
}

async function handleReceivedDonate({ user_id,data }) {
  const payerid = data.memo.substring(0, 36)//uuid lenth =36
  const username = (await client.readUser(payerid)).full_name;
  const { asset_id, amount } = data
  if (Number(amount) <= 0) return 
  const { symbol } = await readNetworkAsset(asset_id)
  await client.sendTextMsg(payerid, `${username}转来的 ${amount} ${symbol} 已收到，感谢您的支持。`)
  //await client.readSnapshots(data.readsnapshot_id).then(console.log)
  await client.readTransfer(data.trace_id)
  .then( async res =>{
    console.log(res)
    let data = res
  let msg_trf_up = await Transfer.create(data);
  console.log(`trf_apdate.id3:${msg_trf_up.id}\n trf_content3:${msg_trf_up.amount}`)
  })
}

//coding
async function creatCode(file){
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
  let result = response.data.choices[0].text.replace(/^\s*[\r\n]/gm, '')
  console.log(result)
  return result
  }

// sql  message_quote_id return data
  async function MsgSeach(quote_message_id){
    let id = quote_message_id
    if(id !=""){
    const msg_find = await Megsent.findOne({ where: 
  {message_id:id } });
    if (msg_find === null) {
    console.log('Not found!');
    } else {
      console.log(`quote_id:${msg_find.id}\nquote_data:${msg_find.data}
  `); 
      return msg_find.data
  };}
  }

  // 查询资产当前价格
  async function readAssetPr(user_id,data){
    const Asset = await searchNetworkAsset(data)//.then(Asset =>{
    //console.log(Asset)
    if (Asset.length === 0){
      client
       .sendMessageText(user_id,`"${data}"数字资产不存在，请核查.`)
      }else{
       const symbol = Asset[0].symbol;
       const asset_id = Asset[0].asset_id;
       const price = Asset[0].price_usd;
       //return [symbol,price]
  client
  //  .sendMessageText(user_id,'asset[0].price_usd')
    .sendMessageText(user_id,`${symbol}当前价格是:$${price}`) 
  }
}
  