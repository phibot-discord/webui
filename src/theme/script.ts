import { THEME_COOKIE } from "./config";

export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)/);if(!m)return;var r=document.documentElement;r.setAttribute("data-theme",m[1]);r.style.colorScheme=m[1]}catch(e){}})()`;
