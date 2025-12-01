import { sponsor, site, author, hero } from '@/config.json'
import { motion } from 'framer-motion'
import * as QR from 'qrcode.react'
import { useAtomValue } from 'jotai'
import { metaSlugAtom, metaTitleAtom } from '@/store/metaInfo'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { useModal } from '@/components/ui/modal'
import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

interface ShareData {
  url: string
  text: string
}

const shareList = [
  {
    name: 'Twitter',
    icon: 'icon-x',
    onClick: (data: ShareData) => {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}&via=${encodeURIComponent(site.title)}`,
      )
    },
  },
  {
    name: '复制链接',
    icon: 'icon-link',
    onClick: (data: ShareData) => {
      navigator.clipboard.writeText(data.url)
      toast.success('已复制到剪贴板')
    },
  },
]

export function ActionAside() {
  return (
    <div
      className="absolute left-0 bottom-0 flex flex-col gap-4"
      style={{
        transform: 'translateY(calc(100% + 24px))',
      }}
    >
      <ShareButton />
      <DonateButton />
    </div>
  )
}

function ShareButton() {
  const postSlug = useAtomValue(metaSlugAtom)
  const postTitle = useAtomValue(metaTitleAtom)
  const { present } = useModal()
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString().trim())
      } else {
        setSelectedText('')
      }
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  const url = new URL(postSlug, site.url).href
  const defaultText = `嘿，我发现了一片宝藏文章「${postTitle}」哩，快来看看吧！`

  const openModal = () => {
    present({
      content: <ShareModal url={url} text={selectedText || defaultText} isSelection={!!selectedText} />,
    })
  }

  return (
    <button
      type="button"
      aria-label="Share this post"
      className="size-6 text-xl leading-none hover:text-accent"
      onClick={() => openModal()}
    >
      <i className="iconfont icon-share"></i>
    </button>
  )
}

function ShareModal({ url, text, isSelection }: { url: string; text: string; isSelection: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const downloadCard = async () => {
    if (!cardRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Better quality
        useCORS: true,
      })
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `share-${Date.now()}.png`
      link.click()
    } catch (error) {
      console.error('Failed to generate share card', error)
      toast.error('生成分享卡片失败')
    } finally {
      setGenerating(false)
    }
  }

  if (isSelection) {
    return (
      <motion.div
        className="bg-transparent flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div
          ref={cardRef}
          className="bg-[#f8f8f8] p-8 w-[375px] text-[#333] flex flex-col gap-8 font-serif shadow-2xl"
          style={{
             backgroundImage: 'linear-gradient(to bottom, #fafafa, #f0f0f0)'
          }}
        >
          <div className="text-lg leading-relaxed whitespace-pre-wrap tracking-wide text-justify opacity-90">
            {text}
          </div>
          
          <div className="mt-auto flex items-end justify-between pt-6 border-t border-black/5">
            <div className="flex items-center gap-3">
              <img 
                src={author.avatar} 
                alt={author.name} 
                className="size-10 rounded-full object-cover border border-white/50"
                crossOrigin="anonymous"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm">{author.name}</span>
                <span className="text-[10px] text-gray-500 max-w-[120px] leading-tight opacity-80">{hero.bio}</span>
              </div>
            </div>
            <div className="bg-white p-1 rounded-sm">
              <QR.QRCodeSVG value={url} size={50} level="M" />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={downloadCard}
            disabled={generating}
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-2"
          >
            {generating ? (
              <i className="iconfont icon-loader animate-spin"></i>
            ) : (
              <i className="iconfont icon-download"></i>
            )}
            保存卡片
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="bg-primary rounded-lg p-2 min-w-[420px] border border-primary flex flex-col"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <h2 className="px-3 py-1 font-bold">分享此内容</h2>
      <hr className="my-2 border-primary" />
      <div className="px-3 py-2 grid grid-cols-[180px_auto] gap-3">
        <QR.QRCodeSVG value={url} size={180} />
        <div className="flex flex-col gap-2">
          <div className="text-sm">分享到...</div>
          <ul className="flex flex-col gap-2">
            {shareList.map((item) => (
              <li
                className="px-2 py-1 flex gap-2 cursor-pointer rounded-md hover:bg-secondary"
                key={item.name}
                onClick={() => item.onClick({ url, text })}
                role="button"
                aria-label={`Share to ${item.name}`}
              >
                <i className={clsx('iconfont text-accent', item.icon)}></i>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

function DonateButton() {
  const { present } = useModal()

  const openDonate = () => {
    present({
      content: <DonateContent />,
    })
  }

  return (
    <button
      type="button"
      aria-label="Donate to author"
      className="size-6 text-xl leading-none hover:text-accent"
      onClick={() => openDonate()}
    >
      <i className="iconfont icon-user-heart"></i>
    </button>
  )
}

function DonateContent() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
    >
      <h2 className="text-center mb-5">感谢您的支持，这将成为我前进的最大动力。</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        <img
          className="object-cover"
          width={300}
          height={300}
          src={sponsor.wechat}
          alt="微信赞赏码"
          loading="lazy"
          decoding="async"
        />
      </div>
    </motion.div>
  )
}
