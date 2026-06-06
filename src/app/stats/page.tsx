'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { GalleryData, Artwork } from '@/lib/types'
import styles from './page.module.css'

interface DayData {
  date: string
  count: number
  artworks: Artwork[]
}

interface WeekDay {
  date: string
  count: number
  artworks: Artwork[]
}

export default function StatsPage() {
  const [data, setData] = useState<GalleryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'work' | 'cp'>('work')
  const [filterValue, setFilterValue] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [cellSize, setCellSize] = useState(14)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const years = useMemo(() => {
    if (!data) return []
    const yearSet = new Set<string>()
    data.artworks.forEach(a => {
      const year = a.createdAt.split('T')[0].split('-')[0]
      yearSet.add(year)
    })
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a))
  }, [data])

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[0])
    }
  }, [years, selectedYear])

  // 计算自适应单元格大小
  useEffect(() => {
    const calculateCellSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        // 可用宽度 = 容器宽度 - 左侧星期标签(24px) - 右边距
        const availableWidth = containerWidth - 24 - 20
        //52周 + 一些余量, 计算每个单元格的宽度
        const numWeeks = 53
        const gap = 3
        const cellSize = Math.floor((availableWidth - (gap * numWeeks)) / numWeeks)
        setCellSize(Math.max(10, Math.min(cellSize, 14))) // 限制在10-14px之间
      }
    }

    calculateCellSize()
    window.addEventListener('resize', calculateCellSize)
    return () => window.removeEventListener('resize', calculateCellSize)
  }, [contributionData.weeks.length])

  // GitHub 风格的周贡献数据
  const contributionData = useMemo((): { weeks: WeekDay[][]; maxCount: number; monthPositions: { month: number; weekIndex: number }[] } => {
    if (!data) return { weeks: [], maxCount: 0, monthPositions: [] }

    const targetYear = selectedYear ? parseInt(selectedYear) : new Date().getFullYear()
    const startDate = new Date(targetYear, 0, 1)
    const endDate = new Date(targetYear, 11, 31)

    // 构建日期到数据的映射
    const dateMap = new Map<string, DayData>()
    data.artworks.forEach(a => {
      const dateStr = a.createdAt.split('T')[0]
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, count: 0, artworks: [] })
      }
      dateMap.get(dateStr)!.count++
      dateMap.get(dateStr)!.artworks.push(a)
    })

    // 计算一年的总天数，生成周网格
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const allDays: WeekDay[] = []

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayData = dateMap.get(dateStr)
      allDays.push({
        date: dateStr,
        count: dayData?.count || 0,
        artworks: dayData?.artworks || []
      })
    }

    // 按周分组 (周一开始)
    const weeks: WeekDay[][] = []
    let currentWeek: WeekDay[] = []

    // 补齐第一周前面的空白天
    const firstDayOfWeek = startDate.getDay()
    for (let i = 0; i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); i++) {
      currentWeek.push({ date: '', count: -1, artworks: [] })
    }

    allDays.forEach(day => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    // 补齐最后一周
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: -1, artworks: [] })
      }
      weeks.push(currentWeek)
    }

    // 计算月份位置
    const monthPositions: { month: number; weekIndex: number }[] = []
    weeks.forEach((week, weekIndex) => {
      week.forEach(day => {
        if (day.date && day.date.endsWith('-01')) {
          const month = parseInt(day.date.split('-')[1])
          if (!monthPositions.find(m => m.month === month)) {
            monthPositions.push({ month, weekIndex })
          }
        }
      })
    })

    const maxCount = Math.max(...allDays.map(d => d.count), 1)

    return { weeks, maxCount, monthPositions }
  }, [data, selectedYear])

  const statsData = useMemo(() => {
    if (!data) return []

    const statMap = new Map<string, { name: string; count: number; works: Set<string> }>()

    data.artworks.forEach(artwork => {
      const artworkYear = artwork.createdAt.split('T')[0].split('-')[0]
      if (selectedYear && artworkYear !== selectedYear) return

      const items = filterType === 'work' ? artwork.works : artwork.cps
      items.forEach(item => {
        if (filterValue && !item.toLowerCase().includes(filterValue.toLowerCase())) return

        if (!statMap.has(item)) {
          statMap.set(item, { name: item, count: 0, works: new Set() })
        }
        const stat = statMap.get(item)!
        stat.count++
        artwork.works.forEach(w => stat.works.add(w))
      })
    })

    return Array.from(statMap.values())
      .sort((a, b) => b.count - a.count)
  }, [data, filterType, filterValue, selectedYear])

  // 用于显示的统计数据（包含作品名标签）
  const displayStatsData = useMemo(() => {
    return statsData.map(stat => ({
      ...stat,
      worksArray: Array.from(stat.works).slice(0, 5) // 最多显示5个作品名
    }))
  }, [statsData])

  const totalArtworks = useMemo(() => {
    if (!data) return 0
    if (!selectedYear) return data.artworks.length
    return data.artworks.filter(a => {
      const year = a.createdAt.split('T')[0].split('-')[0]
      return year === selectedYear
    }).length
  }, [data, selectedYear])

  const handleDayClick = (day: DayData, e: React.MouseEvent) => {
    if (day.count > 0) {
      // 如果点击的是同一个日期，关闭tooltip
      if (selectedDay?.date === day.date) {
        setSelectedDay(null)
      } else {
        setSelectedDay(day)
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top })
      }
    } else {
      setSelectedDay(null)
    }
  }

  const getColorClass = (count: number) => {
    if (count <= 0) return styles.level0
    const ratio = count / contributionData.maxCount
    if (ratio <= 0.25) return styles.level1
    if (ratio <= 0.5) return styles.level2
    if (ratio <= 0.75) return styles.level3
    return styles.level4
  }

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>统计数据</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>日历</h2>
        <div className={styles.calendarYearPicker}>
          {years.map(year => (
            <button
              key={year}
              className={`${styles.yearBtn} ${selectedYear === year ? styles.active : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>

        <div className={styles.graphWrapper} ref={containerRef}>
                   {/* 顶部月份标签 */}
          <div className={styles.monthTopLabels}>
            <div className={styles.weekDayColumn}></div>
            <div className={styles.monthTopContainer}>
              {months.map((month, idx) => (
                <span key={idx} className={styles.monthTopLabel}>{month}</span>
              ))}
            </div>
          </div>

          <div className={styles.graphContainer}>
            {/* 左侧星期标签 */}
            <div className={styles.weekDayColumn}>
              <div className={styles.weekDayLabel}>一</div>
              <div className={styles.weekDayLabel}>三</div>
              <div className={styles.weekDayLabel}>五</div>
            </div>

            {/* 周网格 */}
            <div className={styles.weeksContainer}>
              {contributionData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className={styles.weekColumn}>
                  {week.map((day, dayIndex) => (
                     <div
                      key={dayIndex}
                      className={`${styles.dayCell} ${day.count >= 0 ? getColorClass(day.count) : styles.emptyCell}`}
                      style={{ width: cellSize, height: cellSize }}
                      onClick={(e) => handleDayClick(day, e)}
                      title={day.count > 0 ? `${day.date}: ${day.count}作品` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.graphLegend}>
          <span className={styles.legendText}>少</span>
          <div className={`${styles.legendCell} ${styles.level0}`} />
          <div className={`${styles.legendCell} ${styles.level1}`} />
          <div className={`${styles.legendCell} ${styles.level2}`} />
          <div className={`${styles.legendCell} ${styles.level3}`} />
          <div className={`${styles.legendCell} ${styles.level4}`} />
          <span className={styles.legendText}>多</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>统计分析</h2>

        <div className={styles.filterBar}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className={styles.yearSelect}
          >
            <option value="">全部年份</option>
            {years.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>

          <button
            className={`${styles.filterBtn} ${filterType === 'work' ? styles.active : ''}`}
            onClick={() => setFilterType('work')}
          >
            按作品
          </button>
          <button
            className={`${styles.filterBtn} ${filterType === 'cp' ? styles.active : ''}`}
            onClick={() => setFilterType('cp')}
          >
            按CP
          </button>
          <input
            type="text"
            placeholder={`筛选${filterType === 'work' ? '作品' : 'CP'}名...`}
            value={filterValue}
            onChange={e => setFilterValue(e.target.value)}
            className={styles.filterInput}
          />
        </div>

         <div className={styles.statsTable}>
          <div className={styles.tableHeader}>
            <span className={styles.colName}>{filterType === 'work' ? '作品' : 'CP'}</span>
            <span className={`${styles.colCount} ${styles.colHeader}`}>数量</span>
            <span className={styles.colPercent}>占比</span>
          </div>
          {displayStatsData.map(stat => (
            <div key={stat.name} className={styles.tableRow}>
              <span className={styles.colName}>{stat.name}</span>
              <div className={styles.countCell}>
                <span className={styles.colCount}>{stat.count}</span>
                {filterType === 'cp' && stat.worksArray.length > 0 && (
                  <div className={styles.worksTags}>
                    {stat.worksArray.map((work, i) => (
                      <span key={i} className={styles.workTag}>{work}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.colPercent}>
                <div className={styles.percentBarContainer}>
                  <div
                    className={styles.percentBar}
                    style={{ width: `${totalArtworks > 0 ? (stat.count / totalArtworks) * 100 : 0}%` }}
                  />
                </div>
                <span className={styles.percentText}>
                  {totalArtworks > 0 ? Math.round((stat.count / totalArtworks) * 100 : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.totalRow}>
          <span>总计</span>
          <span className={styles.colCount}>{totalArtworks}</span>
          <span>100%</span>
        </div>
      </section>

      {selectedDay && (
        <div
          className={styles.dayTooltip}
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 10
          }}
          onClick={() => setSelectedDay(null)}
        >
          <div className={styles.tooltipDate}>{selectedDay.date}</div>
          <div className={styles.tooltipCount}>{selectedDay.count} 作品</div>
          {selectedDay.artworks.map(artwork => (
            <span key={artwork.id} className={styles.tooltipArtwork}>
              {artwork.title}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
