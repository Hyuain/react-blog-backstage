import {memo, useEffect, useState} from "react";

import {Button, Checkbox, Image, Input, message, Radio, Space, Upload} from "antd";
import {useNavigate, useParams} from "react-router-dom";
import "../assets/style/blogContent.scss";
import Comments from "../components/Comments";
import BlogEditor from "../components/BlogEditor";
import {useRequest} from "ahooks";
import axios from "axios";
import dayjs from "dayjs";
import store from "../reducer/resso";
import Compressor from "compressorjs";
import {UploadOutlined} from "@ant-design/icons";
import {service} from "../requests/request";

let formData = new FormData();
let imgPathNames, navigator;
let fileCount = 0;
let firstInput = true;
let uploaded = false;

function onChange(setContent,loading,setLoading) {
  return async function (info) {
    uploaded = true;
    if(firstInput){
      setLoading(true);
      firstInput=false;
    }
    let reg = /\.md$/
    if (reg.exec(info.file.name) !== null) {
      let reader = new FileReader();
      reader.readAsText(info.file, 'utf8')
      reader.onload = () => {
        setContent(reader.result)
        fileCount++;
        if(fileCount===info.fileList.length){
          setLoading(false);
          firstInput=true;
          message.success('处理完成')
        }
      }
    } else {
      formData.append(info.file.name, info.file,info.file.name);
      new Compressor(info.file, {
        quality: 0.1,
        convertTypes: ['image/png', 'image/webp'],
        convertSize: 1000000,
        success(result) {
          formData.append(`gzip_${info.file.name}`, result, `gzip_${info.file.name}`);
          fileCount++;
          if(fileCount===info.fileList.length){
            setLoading(false);
            firstInput=true;
            message.success('处理完成')
          }
        },
        error(err) {
          console.log(err.message);
        },
      });
    }
  }
}

function upLoad(content, setContent, firstTime) {

  return async function () {
    imgPathNames = await service.patch('/api/updateBlogImages', formData, {
      headers: {
        'Content-Type': 'image/*'
      },
      params: {
        path: dayjs(firstTime).format('YYYY-MM-DD')
      }
    })
    let reg = /!\[(.*?)\]\((.*?)\)/mg;
    let matcher;
    let tempContent = content;
    let imgLength=imgPathNames.data.length;
    for(let index=0;index<imgLength;index++){
      let splits=imgPathNames.data[index].split('/')
      let fileName=splits[5]
      for (let indexy = 0; (matcher = reg.exec(content)) !== null; indexy++) {
        if(fileName.includes(matcher[1])){
          tempContent = tempContent.replace(matcher[0], `![img](${imgPathNames.data[index]})`)
        }
      }
    }

    setContent(tempContent)
    message.success("上传成功")
  }
}

function getBlogContent(path = '') {
  return function () {
    if (path !== '') {
      return service.get(`${path}`)
    } else {
      return Promise.resolve()
    }
  }
}

function getBlogDetail(id) {
  return function () {
    return service.get('/api/blogs/' + id)
  }
}

function save(id, title, content, tag, type, comments, firstTime, deletedCount,recommend) {
  return async function () {
    let formData = new FormData()
    let file = new File([content], `blogs/${dayjs(firstTime).format('YYYY-MM-DD')}/${title}.md`)
    formData.append(title + '.md', file, title + '.md');
    let result=await service.patch(`/api/updateBlogMd`, formData, {
      params: {
        path: `${dayjs(firstTime).format('YYYY-MM-DD')}`,
      }
    })
    let config = {}
    if (imgPathNames) {
      config.images = imgPathNames.data
      config.post=imgPathNames.data[0]
    }
    await service.patch(`/api/blogs/${id}`, {
      title,
      content: result.data[0],
      tags: tag,
      type,
      comments,
      lastModified: +new Date(),
      recommend,
      ...config
    })
    let info = await axios.get('/api/info')
    await service.patch('/api/info', {
      commentCount: info.data.commentCount - deletedCount,
    })
    await service.patch("/api/updateTags", {
      type: "add",
      tag
    })
    await service.patch('/api/updateInfoLastModified')
    message.success("保存成功")
    navigator('/bloglist')
  }
}

function cancel() {
  navigator('/bloglist')
}

export default memo(function EditBlogPage({my}) {
  navigator = useNavigate()
  let {id} = useParams();
  id = my ? my : id;
  let {refresh, setRefresh,loading, setLoading} = store;
  let mdFile, tempContent, tempTitle, tempType, tempTag, tempComment, firstTime,tempRecommend;
  tempComment = []
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState(1)
  const [tag, setTag] = useState('')
  const [recommend, setRecommend] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  let {data} = useRequest(getBlogDetail(id), {
    refreshDeps: [id]
  });
  if (data) {
    tempTitle = data.data.title
    tempType = data.data.type

    tempTag = data.data.tags
    mdFile = data.data.content;
    tempComment = data.data.comments;
    firstTime = data.data.time;
    tempRecommend=data.data.recommend;
  }
  let {data: datax} = useRequest(getBlogContent(mdFile), {
    refreshDeps: [mdFile]
  })
  if (datax) {
    tempContent = datax.data;
  }
  useEffect(() => {
    setContent(tempContent)
    setType(tempType)
    setTitle(tempTitle)
    setTag(tempTag)
    setRecommend(tempRecommend)
    // setComments(tempComment)
  }, [tempContent])
  useEffect(()=>{
    fileCount=0;
  },[])
  return (
      <>
        <div className={"blog-content"}>
          <Space style={{paddingBottom: '10px', textAlign: 'left'}}>
            <Upload beforeUpload={() => false} onChange={onChange(setContent,loading,setLoading)} directory>
              <Button icon={<UploadOutlined/>}>上传MarkDown文件夹</Button>
            </Upload>
            <Button type={'primary'} onClick={upLoad(content, setContent, firstTime)}>上传图片</Button>
            标题：<Input value={title} onChange={(e) => {
            setTitle(e.target.value)
          }}/>
            分类：<Input value={tag} onChange={(e) => {
            setTag(e.target.value)
          }}/>
            样式：
            <Radio.Group onChange={(e) => {
              setType(e.target.value)
            }} value={type}>
              <Radio value={1}>1</Radio>
              <Radio value={2}>2</Radio>
            </Radio.Group>
            <Checkbox onChange={()=>{setRecommend(!recommend)}} checked={recommend}>推荐</Checkbox>
          </Space>
          <BlogEditor content={content} setContent={setContent}/>
          <Comments comments={tempComment} setRefresh={setRefresh} setDeletedCount={setDeletedCount}
                    deletedCount={deletedCount}/>
          <div className={'action-container'}>
            <Space>
              <Button type={'primary'}
                      onClick={save(id, title, content, tag, type, tempComment, firstTime, deletedCount,recommend)}>保存更改</Button>
              <Button type={'primary'} onClick={cancel}>取消</Button>
            </Space>
          </div>
        </div>
      </>
  );
});
