// Owned Windows capture implementation. No downloaded/native desktop-app modules.
// Hooks only enqueue redacted observations; the dedicated hook thread pumps messages.
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace Nexts.Recording {
    public static class Collector {
        [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
        [StructLayout(LayoutKind.Sequential)] struct Rect { public int left, top, right, bottom; }
        [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int size; public Rect monitor, work; public uint flags; }
        [StructLayout(LayoutKind.Sequential)] struct Mouse { public Point pt; public uint data, flags, time; public UIntPtr extra; }
        [StructLayout(LayoutKind.Sequential)] struct Keyboard { public uint vk, scan, flags, time; public UIntPtr extra; }
        [StructLayout(LayoutKind.Sequential)] struct Message { public IntPtr hwnd; public uint message; public UIntPtr w; public IntPtr l; public uint time; public Point pt; public uint reserved; }
        delegate bool MonitorCallback(IntPtr monitor, IntPtr hdc, ref Rect bounds, IntPtr data);
        delegate IntPtr Hook(int code, IntPtr message, IntPtr data);
        [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorCallback callback, IntPtr data);
        [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
        [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
        [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
        [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetWindowsHookEx(int kind, Hook hook, IntPtr module, uint thread);
        [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
        [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
        [DllImport("user32.dll")] static extern int GetMessage(out Message message, IntPtr window, uint first, uint last);
        [DllImport("user32.dll")] static extern bool TranslateMessage(ref Message message);
        [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref Message message);
        [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint message, UIntPtr w, IntPtr l);
        [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
        [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
        [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);

        static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 64 * 1024 * 1024 };
        static readonly ConcurrentQueue<Dictionary<string, object>> Events = new ConcurrentQueue<Dictionary<string, object>>();
        static volatile bool active;
        static Exception hookError;
        static uint hookThread;
        static IntPtr selectedMonitor;
        static int x, y, width, height;
        static HashSet<string> excluded;
        static readonly bool[] keys = new bool[256];
        static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
        static void Emit(object value) { Console.WriteLine(Json.Serialize(value)); }
        static int Number(Dictionary<string, object> value, string key) { return Convert.ToInt32(value[key]); }
        static void Dpi() { try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch (EntryPointNotFoundException) { SetProcessDPIAware(); } }
        static List<Dictionary<string, object>> Displays() {
            Dpi(); var result = new List<Dictionary<string, object>>();
            if (!EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate(IntPtr h, IntPtr dc, ref Rect r, IntPtr data) {
                var info = new MonitorInfo {size = Marshal.SizeOf(typeof(MonitorInfo))};
                if (!GetMonitorInfo(h, ref info)) return true;
                result.Add(new Dictionary<string, object> {{"name", "Display " + (result.Count + 1)}, {"x", r.left}, {"y", r.top},
                    {"width", r.right-r.left}, {"height", r.bottom-r.top}, {"primary", (info.flags & 1) != 0}, {"handle", h.ToInt64()}});
                return true;
            }, IntPtr.Zero)) throw new System.ComponentModel.Win32Exception();
            return result;
        }
        public static void ListMonitors() {
            var displays = Displays(); foreach (var d in displays) d.Remove("handle"); Emit(displays);
        }
        static bool Modifier(int vk) { return vk == 16 || vk == 17 || vk == 18 || vk == 91 || vk == 92 || (vk >= 160 && vk <= 165); }
        static string SafeKey(int vk, bool ctrl, bool alt, bool shift, bool win) {
            if (ctrl && alt && !win) return "text"; // AltGr can produce ordinary/private text.
            string key;
            switch (vk) {
                case 13: key="Enter"; break; case 9: key="Tab"; break; case 27: key="Escape"; break;
                case 8: key="Backspace"; break; case 46: key="Delete"; break; case 45: key="Insert"; break;
                case 36: key="Home"; break; case 35: key="End"; break; case 33: key="PageUp"; break; case 34: key="PageDown"; break;
                case 37: key="Left"; break; case 38: key="Up"; break; case 39: key="Right"; break; case 40: key="Down"; break;
                default:
                    if (vk >= 112 && vk <= 123) key="F" + (vk-111);
                    else if ((ctrl || alt || win) && ((vk >= 65 && vk <= 90) || (vk >= 48 && vk <= 57))) key=((char)vk).ToString();
                    else return "text";
                    break;
            }
            return (ctrl?"Ctrl+":"") + (alt?"Alt+":"") + (shift?"Shift+":"") + (win?"Win+":"") + key;
        }
        static Dictionary<string, object> Context(bool keyboard) {
            var window = GetForegroundWindow();
            if (keyboard && MonitorFromWindow(window, 2) != selectedMonitor) return null;
            var title = new StringBuilder(241); GetWindowText(window, title, title.Capacity);
            if (excluded.Contains(title.ToString())) return null;
            uint pid; GetWindowThreadProcessId(window, out pid); string app = "";
            try { using (var p = Process.GetProcessById((int)pid)) app = p.ProcessName; } catch { }
            return new Dictionary<string, object> {{"at", Now()}, {"app", app}, {"windowTitle", title.ToString()}};
        }
        static void Enqueue(Dictionary<string, object> e) {
            if (Events.Count >= 20000) throw new InvalidOperationException("Input queue limit reached.");
            Events.Enqueue(e);
        }
        static IntPtr MouseHook(int code, IntPtr message, IntPtr data) {
            if (code >= 0 && active) try {
                int kind = message.ToInt32(); string type = kind==0x201?"leftMouseDown":kind==0x202?"leftMouseUp":kind==0x204?"rightMouseDown":kind==0x205?"rightMouseUp":(kind==0x20a || kind==0x20e)?"scroll":null;
                if (type != null) {
                    var m = (Mouse)Marshal.PtrToStructure(data, typeof(Mouse));
                    if (m.pt.x >= x && m.pt.y >= y && m.pt.x < x+width && m.pt.y < y+height) {
                        var e = Context(false); if (e != null) { e["type"]=type; e["x"]=m.pt.x; e["y"]=m.pt.y;
                            if (type=="scroll") { int delta = (short)(m.data >> 16); e["dx"]=kind==0x20e?delta:0; e["dy"]=kind==0x20a?delta:0; }
                            Enqueue(e);
                        }
                    }
                }
            } catch (Exception error) { hookError=error; active=false; }
            return CallNextHookEx(IntPtr.Zero, code, message, data);
        }
        static IntPtr KeyboardHook(int code, IntPtr message, IntPtr data) {
            if (code >= 0) try {
                var k = (Keyboard)Marshal.PtrToStructure(data, typeof(Keyboard)); int vk=(int)k.vk;
                bool down=message.ToInt32()==0x100 || message.ToInt32()==0x104;
                if (vk >= 0 && vk < keys.Length) keys[vk]=down;
                if (active && down && !Modifier(vk)) {
                    var e=Context(true); if (e!=null) {
                        e["type"]="key"; e["key"]=SafeKey(vk, keys[17]||keys[162]||keys[163], keys[18]||keys[164]||keys[165], keys[16]||keys[160]||keys[161], keys[91]||keys[92]);
                        Enqueue(e);
                    }
                }
            } catch (Exception error) { hookError=error; active=false; }
            return CallNextHookEx(IntPtr.Zero, code, message, data);
        }
        public static void SelfTest() {
            if (SafeKey(65,false,false,false,false)!="text" || SafeKey(65,false,false,true,false)!="text" || SafeKey(65,true,true,false,false)!="text") throw new Exception("Text redaction failed");
            if (SafeKey(65,true,false,false,false)!="Ctrl+A" || SafeKey(13,false,false,false,false)!="Enter") throw new Exception("Key classification failed");
            Displays(); Emit(new {redaction=true, nativeApis=true});
        }
        public static void Run(string requestText) {
            var request=Json.Deserialize<Dictionary<string, object>>(requestText);
            var monitor=(Dictionary<string,object>)request["monitor"];
            x=Number(monitor,"x"); y=Number(monitor,"y"); width=Number(monitor,"width"); height=Number(monitor,"height");
            if (width<2 || height<2 || (long)width*height>64000000) throw new Exception("Unsupported physical screen dimensions");
            selectedMonitor=IntPtr.Zero;
            foreach(var d in Displays()) if(Number(d,"x")==x && Number(d,"y")==y && Number(d,"width")==width && Number(d,"height")==height) selectedMonitor=new IntPtr(Convert.ToInt64(d["handle"]));
            if(selectedMonitor==IntPtr.Zero) throw new Exception("Selected monitor is disconnected or its scaling changed");
            excluded=new HashSet<string>();
            if(request.ContainsKey("excludedWindowTitles")) foreach(var title in (System.Collections.IEnumerable)request["excludedWindowTitles"]) excluded.Add(Convert.ToString(title));
            var folder=Convert.ToString(request["folder"]); var control=Path.Combine(folder,"native-control.json");
            var installed=new ManualResetEvent(false);
            var thread=new Thread(delegate() {
                Hook mouse=MouseHook, keyboard=KeyboardHook; IntPtr mh=IntPtr.Zero, kh=IntPtr.Zero;
                try {
                    hookThread=GetCurrentThreadId();
                    for(int i=0;i<keys.Length;i++) keys[i]=(GetAsyncKeyState(i)&0x8000)!=0;
                    mh=SetWindowsHookEx(14,mouse,GetModuleHandle(null),0); kh=SetWindowsHookEx(13,keyboard,GetModuleHandle(null),0);
                    if(mh==IntPtr.Zero || kh==IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Could not install Windows input hooks");
                    installed.Set(); Message msg; int result;
                    while((result=GetMessage(out msg,IntPtr.Zero,0,0))>0) { TranslateMessage(ref msg); DispatchMessage(ref msg); }
                    if(result<0) throw new System.ComponentModel.Win32Exception();
                } catch(Exception error) { hookError=error; installed.Set(); }
                finally { if(mh!=IntPtr.Zero) UnhookWindowsHookEx(mh); if(kh!=IntPtr.Zero) UnhookWindowsHookEx(kh); GC.KeepAlive(mouse); GC.KeepAlive(keyboard); }
            });
            thread.IsBackground=true; thread.SetApartmentState(ApartmentState.STA); thread.Start();
            try {
                if(!installed.WaitOne(10000)) throw new Exception("Windows input hook initialization timed out");
                if(hookError!=null) throw hookError;
                Emit(new {kind="native-ready"});
                long started=Now(), heartbeat=started, nextFrame=0; string lastAction="";
                var codec=Array.Find(ImageCodecInfo.GetImageEncoders(), c=>c.MimeType=="image/jpeg");
                using(var parameters=new EncoderParameters(1)) {
                    parameters.Param[0]=new EncoderParameter(System.Drawing.Imaging.Encoder.Quality,92L);
                    while(Now()-started<610000) {
                        if(hookError!=null) throw hookError;
                        string action=lastAction;
                        try {
                            var command=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(control));
                            long stamp=Convert.ToInt64(command["heartbeat"]);
                            if(stamp<=Now()+1000) heartbeat=Math.Max(heartbeat,stamp);
                            action=Convert.ToString(command["action"]);
                        } catch(IOException) { } catch(ArgumentException) { }
                        if(action=="stop") break;
                        if(Now()-heartbeat>10000) throw new Exception("Recorder controller disconnected");
                        active=action=="run";
                        if(action!=lastAction) { lastAction=action; Emit(new {kind=active?"resumed":"paused"}); }
                        Dictionary<string,object> e;
                        while(Events.TryDequeue(out e)) if(active) Emit(new {kind="input", input=e});
                        if(active && Now()>=nextFrame) {
                            long at=Now();
                            using(var bitmap=new Bitmap(width/2*2,height/2*2,PixelFormat.Format24bppRgb)) {
                                using(var graphics=Graphics.FromImage(bitmap)) graphics.CopyFromScreen(x,y,0,0,bitmap.Size,CopyPixelOperation.SourceCopy);
                                using(var stream=new MemoryStream()) { bitmap.Save(stream,codec,parameters); Emit(new {kind="frame",at=at,width=bitmap.Width,height=bitmap.Height,jpeg=Convert.ToBase64String(stream.ToArray())}); }
                            }
                            nextFrame=at+200;
                        }
                        Thread.Sleep(20);
                    }
                }
            } finally {
                active=false; PostThreadMessage(hookThread,0x12,UIntPtr.Zero,IntPtr.Zero); thread.Join(2000); installed.Dispose();
            }
        }
    }
}
