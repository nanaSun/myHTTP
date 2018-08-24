class Page{
    constructor(path,callback){
        this.path=path
        this.callback=callback
    }
}
class Router{
    constructor(){
        this.pages=[]
    }
    get(path,callback){
        this.pages.push(new Page(path,callback))
        return this
    }
    use(path,middleware) {
        let router = this;
        middleware.router.pages.forEach(p => {
            router.get(path+p.path,p.callback)
        });
        return router
    }
    compose(ctx,next,routers){
        function dispatch(index){
            if(index===routers.length) return next();
            let router=routers[index]
            router(ctx,()=>dispatch(index+1));
        }
        dispatch(0)
    }
    routers(){
        let dispatch = (ctx,next)=>{
            let path=ctx.path
            console.log(path);
            let routers=this.pages.filter(p=>{return p.path===path}).map(p=>p.callback)
            this.compose(ctx,next,routers)
        }
        dispatch.router=this
        return dispatch
    }
}
module.exports=Router