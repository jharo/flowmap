var Timer=function(){this.Interval=1e3,this.Enable=new Boolean(!1),this.currentCount=0,this.Tick;var b;this.Start=function(){this.Enable=new Boolean(!0),b=this,b.Enable&&(b.timerId=setInterval(function(){b.Tick(),b.currentCount++},b.Interval))},this.Stop=function(){b=this,b.Enable=new Boolean(!1),clearInterval(b.timerId),b.currentCount=0},this.Reset=function(){b=this,b.Enable=new Boolean(!1),this.Stop(),this.Start()}};