let http=require("http")
let context=require("./context")
let response=require("./response")
let request=require("./request")
class myhttp{
    constructor(){
        this.middleware;//中间件
        this.context=Object.create(context)
        this.request=Object.create(request)
        this.response=Object.create(response)
    }
    //回调函数
    use(callback){
        this.middleware=callback;
    }
    createContext(req,res){
        let ctx=this.context
        
        ctx.request=this.request
        ctx.response=this.response

        ctx.request.req=ctx.req=req
        ctx.response.res=ctx.res=res

        return ctx
    }
    handleRequest(req,res){
        let ctx=this.createContext(req,res)
        this.middleware(ctx)
    }
    //各类参数
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
module.exports = myhttp