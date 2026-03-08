import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Mic, MicOff, Send, Loader2, AlertTriangle, Brain, Shield, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Disease {
  name: string;
  name_bn: string;
  confidence: number;
}

interface MedicineAlt {
  brand: string;
  manufacturer: string;
  price: string;
}

interface Medicine {
  name: string;
  generic: string;
  price: string;
  alternatives?: MedicineAlt[];
}

interface TriageResult {
  urgency_level: string;
  diseases: Disease[];
  follow_up_question?: string;
  follow_up_question_bn?: string;
  recommended_facility?: string;
  recommended_facility_bn?: string;
  specialist?: string;
  medicines?: Medicine[];
  explanation?: string;
  explanation_bn?: string;
  ml_classifier_used?: boolean;
  ai_fallback?: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  result?: TriageResult;
}

export default function Triage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Speech recognition not supported', variant: 'destructive' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + text);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
    recognitionRef.current = recognition;
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMessage: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('healthmax-triage', {
        body: {
          symptoms: msg,
          language: lang,
          session_id: sessionId,
          conversation: messages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;
      if (data.session_id) setSessionId(data.session_id);

      const assistantMsg: Message = {
        role: 'assistant',
        content: lang === 'bn' ? (data.explanation_bn || data.explanation || '') : (data.explanation || ''),
        result: data,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      toast({
        title: lang === 'bn' ? 'ত্রুটি হয়েছে' : 'Error occurred',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = (answer: string) => sendMessage(answer);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold font-bangla mb-2 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'স্বাস্থ্য ট্রায়াজ' : 'Health Triage'}
      </h1>
      <div className="flex gap-2 mb-6">
        <Badge variant="outline" className="gap-1 text-xs"><Shield className="h-3 w-3" />{lang === 'bn' ? 'নিরাপত্তা গার্ড' : 'Safety Guard'}</Badge>
        <Badge variant="outline" className="gap-1 text-xs"><Brain className="h-3 w-3" />{lang === 'bn' ? 'ML ক্লাসিফায়ার' : 'ML Classifier'}</Badge>
        <Badge variant="outline" className="gap-1 text-xs"><Pill className="h-3 w-3" />{lang === 'bn' ? 'ওষুধ পরামর্শ' : 'Medicine Advice'}</Badge>
      </div>

      {/* Conversation */}
      <div className="space-y-4 mb-6 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12 font-bangla">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg mb-2">
              {lang === 'bn'
                ? 'আপনার লক্ষণগুলো নিচে লিখুন বা বলুন'
                : 'Type or speak your symptoms below'}
            </p>
            <p className="text-sm">
              {lang === 'bn'
                ? 'উদাহরণ: "আমার মাথা ব্যথা, জ্বর আছে, শরীর ব্যথা"'
                : 'Example: "I have headache, fever, and body ache"'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={msg.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]'
              : 'bg-card border rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] space-y-4'
            }>
              <p className="font-bangla text-sm whitespace-pre-wrap">{msg.content}</p>

              {msg.result && (
                <div className="space-y-4 mt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <UrgencyBadge level={msg.result.urgency_level} />
                    {msg.result.ml_classifier_used && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Brain className="h-3 w-3" />
                        {msg.result.ai_fallback ? 'ML Only' : 'ML + AI'}
                      </Badge>
                    )}
                  </div>

                  {msg.result.diseases && msg.result.diseases.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{t('topDiseases')}</p>
                      {msg.result.diseases.map((d, j) => (
                        <ConfidenceBar
                          key={j}
                          label={lang === 'bn' ? d.name_bn || d.name : d.name}
                          value={d.confidence}
                        />
                      ))}
                    </div>
                  )}

                  {msg.result.specialist && (
                    <div className="text-sm">
                      <span className="font-semibold font-bangla">{t('specialist')}: </span>
                      <span className="font-bangla">{msg.result.specialist}</span>
                    </div>
                  )}

                  {msg.result.recommended_facility && (
                    <div className="text-sm">
                      <span className="font-semibold font-bangla">{t('recommendedFacility')}: </span>
                      <span className="font-bangla">{lang === 'bn' ? msg.result.recommended_facility_bn || msg.result.recommended_facility : msg.result.recommended_facility}</span>
                    </div>
                  )}

                  {msg.result.medicines && msg.result.medicines.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{t('suggestedMedicines')}</p>
                      {msg.result.medicines.map((m, j) => (
                        <div key={j} className="text-xs bg-muted rounded-lg p-2.5 space-y-1">
                          <div>
                            <span className="font-semibold">{m.name}</span>
                            <span className="text-muted-foreground"> ({m.generic})</span>
                          </div>
                          <div className="text-primary font-medium">{m.price}</div>
                          {m.alternatives && m.alternatives.length > 0 && (
                            <div className="border-t pt-1 mt-1">
                              <span className="text-muted-foreground">{lang === 'bn' ? 'বিকল্প:' : 'Alternatives:'}</span>
                              {m.alternatives.map((alt, k) => (
                                <span key={k} className="ml-1">{alt.brand} ({alt.price})</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.result.follow_up_question && (
                    <Card className="bg-secondary/50 border-0">
                      <CardContent className="pt-4 pb-3">
                        <p className="font-bangla text-sm mb-3">
                          {lang === 'bn' ? msg.result.follow_up_question_bn || msg.result.follow_up_question : msg.result.follow_up_question}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleFollowUp(lang === 'bn' ? 'হ্যাঁ' : 'Yes')}>
                            {t('followUpYes')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleFollowUp(lang === 'bn' ? 'না' : 'No')}>
                            {t('followUpNo')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <p className="text-xs text-muted-foreground italic font-bangla border-t pt-2">
                    ⚠️ {t('disclaimer')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-bangla text-muted-foreground">{t('analyzing')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-4 bg-background/80 backdrop-blur-md rounded-2xl border p-3 shadow-lg">
        <div className="flex gap-2">
          <Textarea
            placeholder={t('enterSymptoms')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="min-h-[48px] max-h-[120px] resize-none font-bangla border-0 focus-visible:ring-0 bg-transparent"
            rows={1}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant={isRecording ? 'destructive' : 'outline'}
              onClick={isRecording ? stopVoiceInput : startVoiceInput}
              className="shrink-0"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
