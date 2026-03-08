import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, CheckCircle } from 'lucide-react';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function AdminImport() {
  const { lang } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);

  const handleImport = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Parse CSV - format: id, brand_name, medicine_type, slug, form, generic_name, strength, manufacturer, price_info, pack_info
      const medicines = lines.map(line => {
        const cols = parseCSVLine(line);
        return {
          brand_name: cols[1] || 'Unknown',
          medicine_type: cols[2] || 'allopathic',
          slug: cols[3] || null,
          form: cols[4] || null,
          generic_name: cols[5] || null,
          strength: cols[6] || null,
          manufacturer: cols[7] || null,
          price_info: cols[8] || null,
          pack_info: cols[9] || null,
        };
      }).filter(m => m.brand_name && m.brand_name !== 'Unknown');

      // Send in chunks of 500
      const chunkSize = 500;
      let totalInserted = 0;
      let totalErrors = 0;
      const totalChunks = Math.ceil(medicines.length / chunkSize);

      // Clear existing first
      const { data: firstResult, error: firstError } = await supabase.functions.invoke('medicine-import', {
        body: { medicines: medicines.slice(0, chunkSize), clear_existing: true },
      });

      if (firstError) throw firstError;
      totalInserted += firstResult.inserted || 0;
      totalErrors += firstResult.errors || 0;
      setProgress(Math.round((1 / totalChunks) * 100));

      // Remaining chunks
      for (let i = chunkSize; i < medicines.length; i += chunkSize) {
        const chunk = medicines.slice(i, i + chunkSize);
        const { data, error } = await supabase.functions.invoke('medicine-import', {
          body: { medicines: chunk, clear_existing: false },
        });
        if (error) {
          totalErrors += chunk.length;
        } else {
          totalInserted += data.inserted || 0;
          totalErrors += data.errors || 0;
        }
        setProgress(Math.round(((Math.floor(i / chunkSize) + 1) / totalChunks) * 100));
      }

      setResult({ inserted: totalInserted, errors: totalErrors });
      toast({
        title: lang === 'bn' ? 'আমদানি সম্পন্ন!' : 'Import Complete!',
        description: `${totalInserted} medicines imported${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      });
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  if (role !== 'healthcare_professional') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground font-bangla">
          {lang === 'bn' ? 'শুধুমাত্র স্বাস্থ্যকর্মীদের জন্য প্রবেশযোগ্য' : 'Only accessible to healthcare professionals'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-bangla mb-6 flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'ওষুধ ডেটা আমদানি' : 'Medicine Data Import'}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-bangla text-base">
            {lang === 'bn' ? 'CSV ফাইল আপলোড করুন' : 'Upload CSV File'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground font-bangla">
            {lang === 'bn'
              ? 'DGDA ওষুধের CSV ফাইল নির্বাচন করুন। বিদ্যমান ডেটা প্রতিস্থাপিত হবে।'
              : 'Select the DGDA medicine CSV file. Existing data will be replaced.'}
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />

          <Button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full font-bangla gap-2"
            size="lg"
          >
            {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {importing
              ? (lang === 'bn' ? 'আমদানি হচ্ছে...' : 'Importing...')
              : (lang === 'bn' ? 'CSV ফাইল নির্বাচন করুন' : 'Select CSV File')}
          </Button>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {result && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm font-bangla">
                  {lang === 'bn' ? 'আমদানি সম্পন্ন' : 'Import Complete'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.inserted} {lang === 'bn' ? 'ওষুধ সফলভাবে যোগ হয়েছে' : 'medicines imported successfully'}
                  {result.errors > 0 && ` (${result.errors} ${lang === 'bn' ? 'ত্রুটি' : 'errors'})`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
