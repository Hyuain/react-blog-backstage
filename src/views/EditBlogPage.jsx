import {memo, useEffect, useState} from "react";

import {Button, Image, Input, message, Radio, Space} from "antd";
import {useNavigate, useParams} from "react-router-dom";
import "../assets/style/blogContent.scss";
import Comments from "../components/Comments";
import BlogEditor from "../components/BlogEditor";
import {useRequest} from "ahooks";
import axios from "axios";
import dayjs from "dayjs";
import store from "../reducer/resso";
let navigator;

function getBlogContent(path = '') {
  return function () {
    if (path !== '') {
      return axios.get(`http://192.168.31.30:3000${path}`)
    } else {
      return Promise.resolve()
    }
  }
}

function getBlogDetail(id) {
  return function () {
    return axios.get('/api/blogs/' + id)
  }
}

function save(id, title, content, tag, type, comments, firstTime, deletedCount) {
  return async function () {
    let formData = new FormData()
    let file = new File([content], `blogs/${dayjs(firstTime).format('YYYY-MM-DD')}/${title}.md`)
    formData.append(title + '.md', file);
    await axios.patch(`/api/updateBlogMd`, formData, {
      params: {
        path: `${dayjs(firstTime).format('YYYY-MM-DD')}`,
      }
    })
    await axios.patch(`/api/blogs/${id}`, {
      title,
      content: `/blogs/${dayjs(firstTime).format('YYYY-MM-DD')}/${title}.md`,
      tag,
      type,
      comments,
      lastModified: +new Date()
    })
    let info = await axios.get('/api/info')
    await axios.patch('/api/info', {
      commentCount: info.data.commentCount - deletedCount,
    })
    await axios.patch("/api/updateTags", {
      type: "add",
      tag
    })
    await axios.patch('/api/updateInfoLastModified')
    message.success("保存成功")
    navigator('/bloglist')
  }
}

function cancel() {

}

export default memo(function EditBlogPage() {
  navigator=useNavigate()
  const {id} = useParams();
  let {refresh, setRefresh} = store;
  let mdFile, tempContent, tempTitle, tempType, tempTag, tempComment, firstTime;
  tempComment = []
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState(1)
  const [tag, setTag] = useState('')
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
    // setComments(tempComment)
  }, [tempContent])
  return (
      <>
        <div className={"blog-content"}>
          <Space style={{paddingBottom: '10px', textAlign: 'left'}}>
            标题：<Input value={title} onChange={(e) => {
            setTitle(e.target.value)
          }}/>
            分类：<Input value={tag} onChange={(e) => {
            setTag(e.target.value)
          }}/>
            <Radio.Group onChange={(e) => {
              setType(e.target.value)
            }} defaultValue={type}>
              <Radio value={1}>1</Radio>
              <Radio value={2}>2</Radio>
            </Radio.Group>
          </Space>
          <BlogEditor content={content} setContent={setContent}/>
          <Comments comments={tempComment} refresh={refresh} setRefresh={setRefresh} setDeletedCount={setDeletedCount}
                    deletedCount={deletedCount}/>
          <div className={'action-container'}>
            <Space>
              <Button type={'primary'}
                      onClick={save(id, title, content, tag, type, tempComment, firstTime, deletedCount)}>保存更改</Button>
              <Button type={'primary'} onClick={cancel}>取消</Button>
            </Space>
          </div>
        </div>
      </>
  );
});