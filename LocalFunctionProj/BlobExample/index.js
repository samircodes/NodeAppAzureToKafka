import {publishtokafka} from './main.js'


// module.exports = async function (context, req) {
export default async function (context) {
    
             await publishtokafka(context);
            context.log('Node.js Blob trigger function processed', context.bindings.myBlob);
       

    
}

