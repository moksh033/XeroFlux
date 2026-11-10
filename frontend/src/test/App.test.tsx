import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from '../App';
import { ThemeProvider } from '../theme';
vi.mock('../components/IndiaMap',()=>({default:()=> <div aria-label="Unit-test WebGL substitute"/>}));
function renderWorkspace(){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<ThemeProvider><QueryClientProvider client={client}><App/></QueryClientProvider></ThemeProvider>);}
beforeEach(()=>{window.localStorage.clear();window.location.hash='#/overview';vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(Response.json({error:{code:'NOT_FOUND',message:'Synthetic backend offline test',details:{}}},{status:404}))));});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('Connected workspace navigation',()=>{
 it('keeps filter state when falling back from an unknown route',async()=>{
  window.location.hash='#/unknown?hazard=floods&state_id=SYNTHETIC';renderWorkspace();
  expect(screen.getByText(/Page not found/)).toHaveAttribute('role','status');
  expect(screen.getByRole('link',{name:'Disaster Explorer'})).toHaveAttribute('href','#/explorer?hazard=floods&state_id=SYNTHETIC');
  await screen.findByRole('heading',{level:1},{timeout:5000});
 });
 it('returns focus after Escape closes the mobile navigation drawer',()=>{
  renderWorkspace();fireEvent.click(screen.getByRole('button',{name:'Open navigation'}));
  expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.keyDown(document,{key:'Escape'});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Open navigation'})).toHaveFocus();
 });
});
