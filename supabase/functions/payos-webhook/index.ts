import {PayOS} from 'npm:@payos/node@2.0.5';
import {runtimeHandler} from '../_shared/payos-runtime.mjs';
Deno.serve(runtimeHandler({env:(name:string)=>Deno.env.get(name),sdk:(options:ConstructorParameters<typeof PayOS>[0])=>new PayOS(options),mode:'webhook'}));
