let http=require("http")
let context=require("./context")
let response=require("./response")
let request=require("./request")
//let eventEmit=require("eventEmit")
let ejs=require("ejs")
console.log(ejs)
class myhttp{
    constructor(){
        this.middlewares=[];//中间件
        this.context=Object.create(context)
        this.request=Object.create(request)
        this.response=Object.create(response)
    }
    //回调函数
    use(callback){
        this.middlewares.push(callback);
    }
    // 封装req和res，顺便加入ctx
    createContext(req,res){
        let ctx=this.context
        
        ctx.request=this.request
        ctx.response=this.response

        ctx.request.req=ctx.req=req
        ctx.response.res=ctx.res=res

        return ctx
    }
    compose(ctx,middlewares){
        async function dispatch(index){
            console.log(index)
            if(index===middlewares.length) return;
            let fn=middlewares[index]
            await fn(ctx,()=>dispatch(index+1));
        }
        return dispatch(0)
    }
    //处理server返回的req和res
    handleRequest(req,res){
        // 创建上下文，链接http的req和res
        let ctx=this.createContext(req,res)
        // 组合执行所有函数
        this.compose(ctx,this.middlewares).then(()=>{
            res.end(ctx.body)
        }).catch(err=>{
            this.emit('error',err)
        })
        
    }
    //各类参数
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
module.exports = myhttp