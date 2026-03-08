import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Pill, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Medicines() {
  const { lang } = useLanguage();
  const [search, setSearch] = useState('');

  const { data: medicines, isLoading } = useQuery({
    queryKey: ['medicines', search],
    queryFn: async () => {
      let query = supabase
        .from('medicines')
        .select('*')
        .limit(50);

      if (search.trim()) {
        query = query.or(`brand_name.ilike.%${search}%,generic_name.ilike.%${search}%,manufacturer.ilike.%${search}%`);
      }

      const { data, error } = await query.order('brand_name');
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-bangla mb-6 flex items-center gap-2">
        <Pill className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'ওষুধ অনুসন্ধান' : 'Medicine Search'}
      </h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 font-bangla"
          placeholder={lang === 'bn' ? 'ওষুধের নাম বা জেনেরিক নাম লিখুন...' : 'Search by medicine or generic name...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {medicines?.map(med => (
          <Card key={med.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base">{med.brand_name}</h3>
                <Badge variant="secondary" className="text-xs shrink-0">{med.form || 'N/A'}</Badge>
              </div>
              <p className="text-sm text-primary font-medium mb-1">{med.generic_name}</p>
              {med.strength && (
                <p className="text-xs text-muted-foreground mb-1">
                  {lang === 'bn' ? 'মাত্রা' : 'Strength'}: {med.strength}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2">
                {lang === 'bn' ? 'প্রস্তুতকারক' : 'Manufacturer'}: {med.manufacturer}
              </p>
              {med.price_info && (
                <div className="text-sm font-semibold text-primary bg-primary/5 rounded-md px-2 py-1">
                  {med.price_info}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {medicines && medicines.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground font-bangla">
          {lang === 'bn' ? 'কোনো ওষুধ পাওয়া যায়নি' : 'No medicines found'}
        </div>
      )}
    </div>
  );
}
