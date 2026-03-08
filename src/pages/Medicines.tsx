import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Pill, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const PAGE_SIZE = 30;

export default function Medicines() {
  const { lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Get total count
  const { data: totalCount } = useQuery({
    queryKey: ['medicines-count', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('medicines')
        .select('*', { count: 'exact', head: true });

      if (debouncedSearch.trim()) {
        query = query.or(`brand_name.ilike.%${debouncedSearch}%,generic_name.ilike.%${debouncedSearch}%,manufacturer.ilike.%${debouncedSearch}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: medicines, isLoading } = useQuery({
    queryKey: ['medicines', debouncedSearch, page],
    queryFn: async () => {
      let query = supabase
        .from('medicines')
        .select('*')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (debouncedSearch.trim()) {
        query = query.or(`brand_name.ilike.%${debouncedSearch}%,generic_name.ilike.%${debouncedSearch}%,manufacturer.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query.order('brand_name');
      if (error) throw error;
      return data;
    },
  });

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-bangla mb-2 flex items-center gap-2">
        <Pill className="h-6 w-6 text-primary" />
        {lang === 'bn' ? 'ওষুধ অনুসন্ধান' : 'Medicine Search'}
      </h1>

      {totalCount !== undefined && (
        <p className="text-sm text-muted-foreground mb-4">
          {lang === 'bn' ? `মোট ${totalCount.toLocaleString()} ওষুধ` : `${totalCount.toLocaleString()} medicines total`}
          {debouncedSearch && (lang === 'bn' ? ` — "${debouncedSearch}" এর ফলাফল` : ` — results for "${debouncedSearch}"`)}
        </p>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 font-bangla"
          placeholder={lang === 'bn' ? 'ওষুধের নাম, জেনেরিক নাম বা প্রস্তুতকারক লিখুন...' : 'Search by medicine name, generic name, or manufacturer...'}
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
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0">
                  {med.form || 'N/A'}
                </span>
              </div>
              <p className="text-sm text-primary font-medium mb-1">{med.generic_name}</p>
              {med.strength && (
                <p className="text-xs text-muted-foreground mb-1">
                  {lang === 'bn' ? 'মাত্রা' : 'Strength'}: {med.strength}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-1">
                {lang === 'bn' ? 'প্রস্তুতকারক' : 'Manufacturer'}: {med.manufacturer}
              </p>
              {med.medicine_type && med.medicine_type !== 'allopathic' && (
                <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                  {med.medicine_type}
                </span>
              )}
              {med.price_info && (
                <div className="text-sm font-semibold text-primary bg-primary/5 rounded-md px-2 py-1 mt-2">
                  {med.price_info}
                </div>
              )}
              {med.pack_info && (
                <p className="text-xs text-muted-foreground mt-1">{med.pack_info}</p>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {lang === 'bn' ? 'আগের' : 'Previous'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {lang === 'bn'
              ? `পৃষ্ঠা ${page + 1} / ${totalPages}`
              : `Page ${page + 1} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            {lang === 'bn' ? 'পরের' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
