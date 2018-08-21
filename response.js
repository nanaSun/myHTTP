let response={
    get body(){
        return this.res.body
    },
    set body(value){
        this.res.body=value
    }
}
module.exports =  response