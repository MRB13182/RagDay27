import React from 'react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<React.PropsWithChildren, {hasError:boolean}> {
  state={hasError:false};
  static getDerivedStateFromError(){return {hasError:true};}
  componentDidCatch(error:Error,info:React.ErrorInfo){
    console.error('RagDay27 application render failed:',error,info.componentStack);
  }
  render(){
    if(this.state.hasError){
      return <main role="alert" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#f8f9fc',color:'#111827',fontFamily:'system-ui,sans-serif'}}>
        <section style={{maxWidth:520,textAlign:'center'}}>
          <h1 style={{fontSize:24,fontWeight:800,marginBottom:12}}>Something went wrong</h1>
          <p style={{lineHeight:1.6,marginBottom:20}}>The page could not be displayed. Please reload the website. If the problem continues, contact the website team.</p>
          <button type="button" onClick={()=>window.location.reload()} style={{border:0,borderRadius:12,padding:'12px 20px',background:'#4f46e5',color:'#fff',fontWeight:700,cursor:'pointer'}}>Reload website</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

const rootElement=document.getElementById('root');
if(!rootElement) throw new Error('Required #root element was not found in index.html.');

createRoot(rootElement).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
