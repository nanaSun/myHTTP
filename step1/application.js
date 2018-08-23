let http=require("http")
let context=require("./context")
let response=require("./response")
let request=require("./request")
class myhttp{
    handleRequest(req,res){
        console.log(req,res)
    }
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
module.exports=myhttp