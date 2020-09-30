-- select distinct composer
select distinct composer
from chart;


-- count duplicates
select count(*) as nb_without_duplicates, sum(c) as nb_with_duplicates
from (
         select data, count(*) as c
         from chart
         group by data
     );


-- remove duplicates
delete
from chart
where rowid not in
      (
          select min(rowid)
          from chart
          group by data
      );

-- 74644 - 38026 => 36618 charts after removing duplicates

-- get last id then update chart sequence
update sqlite_sequence
set seq = (select max(id) from chart)
where name = 'chart';

