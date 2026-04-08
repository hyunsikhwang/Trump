import { useState, useEffect, useCallback } from "react";
import { fetchTelegramPosts } from "./services/telegramService";
import { translateToKorean } from "./services/geminiService";
import { Post, Settings } from "./types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  RefreshCw, 
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  User as UserIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_INTERVAL = 10; // 10 minutes
const STORAGE_KEYS = {
  POSTS: "trump_monitor_posts",
  SETTINGS: "trump_monitor_settings"
};

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newInterval, setNewInterval] = useState<string>("");

  // Load initial data from LocalStorage
  useEffect(() => {
    const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      const initialSettings: Settings = {
        lastProcessedId: "",
        checkInterval: DEFAULT_INTERVAL
      };
      setSettings(initialSettings);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
    }
  }, []);

  const updateInterval = () => {
    if (!newInterval || !settings) return;
    const interval = parseInt(newInterval);
    if (isNaN(interval) || interval < 1) return;

    const updatedSettings = { ...settings, checkInterval: interval };
    setSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    setNewInterval("");
    toast.success(`체크 주기가 ${interval}분으로 변경되었습니다.`);
  };

  const checkNewPosts = useCallback(async () => {
    if (isChecking || !settings) return;
    
    setIsChecking(true);
    setError(null);
    try {
      const telegramPosts = await fetchTelegramPosts();
      const lastIdRaw = settings.lastProcessedId || "";
      const lastId = lastIdRaw.includes('/') ? lastIdRaw.split('/').pop() || "" : lastIdRaw;
      
      const newPostsRaw = telegramPosts.filter(p => !lastId || parseInt(p.id) > parseInt(lastId)).reverse();

      if (newPostsRaw.length > 0) {
        toast.success(`${newPostsRaw.length}개의 새로운 포스트를 발견했습니다! 번역 중...`);
        
        const processedPosts: Post[] = [];
        let latestId = lastId;

        for (const p of newPostsRaw) {
          const translated = await translateToKorean(p.text);
          const newPost: Post = {
            id: p.id,
            originalText: p.text,
            translatedText: translated,
            timestamp: Date.now()
          };
          processedPosts.push(newPost);
          latestId = p.id;
        }

        // Update state and LocalStorage
        const updatedPosts = [...processedPosts, ...posts].slice(0, 100); // Keep last 100
        setPosts(updatedPosts);
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

        const updatedSettings = { ...settings, lastProcessedId: latestId };
        setSettings(updatedSettings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));

        toast.success("모든 포스트 번역 완료!");
      }
      
      setLastCheckTime(new Date());

      // Cleanup: Delete posts older than 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const filteredPosts = posts.filter(p => p.timestamp >= sevenDaysAgo);
      if (filteredPosts.length !== posts.length) {
        setPosts(filteredPosts);
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(filteredPosts));
      }
    } catch (err) {
      console.error("Error checking posts:", err);
      setError("포스트를 확인하는 중 오류가 발생했습니다.");
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, settings, posts]);

  // Periodic check
  useEffect(() => {
    if (!settings) return;

    const intervalMs = settings.checkInterval * 60 * 1000;
    const interval = setInterval(() => {
      checkNewPosts();
    }, intervalMs);

    // Initial check on load if we have settings
    checkNewPosts();

    return () => clearInterval(interval);
  }, [settings, checkNewPosts]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <Toaster position="top-right" richColors />
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Bell className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Trump Monitor</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> 로컬 감시 중
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{settings?.checkInterval}분 간격</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkNewPosts} 
              disabled={isChecking}
              className="hidden sm:flex items-center gap-2 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? '확인 중...' : '지금 확인'}
            </Button>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar / Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">상태 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{posts.length}</p>
                    <p className="text-xs text-slate-500 font-medium">처리된 포스트</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-blue-600 w-6 h-6" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>마지막 확인</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {lastCheckTime ? lastCheckTime.toLocaleTimeString() : '대기 중...'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interval" className="text-xs font-semibold text-slate-500 uppercase">체크 주기 (분)</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="interval"
                        type="number" 
                        placeholder={settings?.checkInterval.toString()} 
                        value={newInterval}
                        onChange={(e) => setNewInterval(e.target.value)}
                        className="h-9"
                      />
                      <Button size="sm" onClick={updateInterval} className="bg-slate-900">변경</Button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">채널 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">@realDonaldTrump_en</span>
                  <a 
                    href="https://t.me/s/realDonaldTrump_en/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  이 채널은 도널드 트럼프의 공식 텔레그램 포스트를 실시간으로 수집합니다. 데이터는 브라우저 로컬 저장소에 안전하게 보관됩니다.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">최신 번역 포스트</h2>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none px-3 py-1">
                {posts.length} Posts
              </Badge>
            </div>

            <ScrollArea className="h-[calc(100vh-250px)] pr-4">
              <div className="space-y-6 pb-12">
                <AnimatePresence mode="popLayout">
                  {posts.length === 0 && !isChecking ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200"
                    >
                      <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">아직 처리된 포스트가 없습니다.</p>
                      <Button variant="link" onClick={checkNewPosts} className="text-blue-600">지금 확인하기</Button>
                    </motion.div>
                  ) : (
                    posts.map((post) => (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group">
                          <div className="h-1 w-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-slate-200 text-slate-500">
                                #{post.id}
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(post.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium leading-relaxed text-slate-900">
                                {post.translatedText}
                              </p>
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                              <p className="text-[10px] text-slate-400 font-mono line-clamp-2 italic">
                                {post.originalText}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}

                  {isChecking && posts.length === 0 && (
                    <div className="space-y-6">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="border-none shadow-sm bg-white p-6 space-y-4">
                          <Skeleton className="h-4 w-24" />
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-3/4" />
                          </div>
                          <Skeleton className="h-4 w-full mt-4" />
                        </Card>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
