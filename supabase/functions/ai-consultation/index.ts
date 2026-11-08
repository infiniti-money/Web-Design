import {aiHandler} from '../_shared/ai-runtime.mjs';
import {knowledge} from '../_shared/ai-knowledge.mjs';
Deno.serve(aiHandler({env:name=>Deno.env.get(name),knowledge}));
